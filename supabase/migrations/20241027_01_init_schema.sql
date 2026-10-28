-- RouteReady Campus - Database Initialization Migration
-- Phase 1: Extensions, Tables, Foreign Keys, Triggers, and Performance Indices

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 3. colleges table
CREATE TABLE IF NOT EXISTS public.colleges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    contact_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('student', 'admin')) DEFAULT 'student',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_profiles_modtime
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function and trigger to prevent non-admins from changing their role or college_id
CREATE OR REPLACE FUNCTION public.check_profile_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user is changing role or college_id
    IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.college_id IS DISTINCT FROM OLD.college_id) THEN
        -- Only an admin is allowed to modify role or college_id
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        ) THEN
            RAISE EXCEPTION 'Forbidden: You do not have permission to modify account role or college affiliation.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE TRIGGER enforce_profile_security
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.check_profile_update();

-- Automatic profile creation on auth.users INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_cid UUID;
BEGIN
    -- Resolve college_id from metadata or default to first college
    default_cid := (NEW.raw_user_meta_data->>'college_id')::UUID;
    IF default_cid IS NULL THEN
        SELECT id INTO default_cid FROM public.colleges ORDER BY created_at ASC LIMIT 1;
    END IF;

    -- Insert new profile with strictly 'student' role (never allow public admin creation)
    INSERT INTO public.profiles (id, college_id, full_name, role)
    VALUES (
        NEW.id,
        default_cid,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'student'
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Trigger on auth.users for automated profile provisioning
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. buses table
CREATE TABLE IF NOT EXISTS public.buses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
    bus_number TEXT NOT NULL,
    registration_number TEXT,
    capacity INTEGER CHECK (capacity > 0),
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'maintenance')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_buses_college_bus_number UNIQUE (college_id, bus_number)
);

CREATE OR REPLACE TRIGGER update_buses_modtime
    BEFORE UPDATE ON public.buses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. stops table
CREATE TABLE IF NOT EXISTS public.stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    locality TEXT,
    latitude DOUBLE PRECISION CHECK (latitude BETWEEN -90.0 AND 90.0),
    longitude DOUBLE PRECISION CHECK (longitude BETWEEN -180.0 AND 180.0),
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_stops_modtime
    BEFORE UPDATE ON public.stops
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. routes table
CREATE TABLE IF NOT EXISTS public.routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
    route_code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_routes_college_route_code UNIQUE (college_id, route_code)
);

CREATE OR REPLACE TRIGGER update_routes_modtime
    BEFORE UPDATE ON public.routes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. route_stops table (ordered stops on a route)
CREATE TABLE IF NOT EXISTS public.route_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    stop_id UUID NOT NULL REFERENCES public.stops(id) ON DELETE CASCADE,
    stop_sequence INTEGER NOT NULL CHECK (stop_sequence >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_route_stops_sequence UNIQUE (route_id, stop_sequence),
    CONSTRAINT uq_route_stops_unique_stop UNIQUE (route_id, stop_id)
);

-- 9. route_buses junction table
CREATE TABLE IF NOT EXISTS public.route_buses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_route_buses_pair UNIQUE (route_id, bus_id)
);

-- 10. schedules table
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
    service_period TEXT NOT NULL CHECK (service_period IN ('morning', 'evening')),
    operating_days SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5}'::SMALLINT[],
    valid_from DATE,
    valid_until DATE,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_schedules_modtime
    BEFORE UPDATE ON public.schedules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. schedule_stop_times table
CREATE TABLE IF NOT EXISTS public.schedule_stop_times (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
    route_stop_id UUID NOT NULL REFERENCES public.route_stops(id) ON DELETE CASCADE,
    scheduled_time TIME WITHOUT TIME ZONE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_schedule_route_stop UNIQUE (schedule_id, route_stop_id)
);

CREATE OR REPLACE TRIGGER update_schedule_stop_times_modtime
    BEFORE UPDATE ON public.schedule_stop_times
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cross-table integrity trigger: Ensure route_stop belongs to the schedule's route
CREATE OR REPLACE FUNCTION public.validate_schedule_stop_time()
RETURNS TRIGGER AS $$
DECLARE
    sch_route_id UUID;
    rs_route_id UUID;
BEGIN
    SELECT route_id INTO sch_route_id FROM public.schedules WHERE id = NEW.schedule_id;
    SELECT route_id INTO rs_route_id FROM public.route_stops WHERE id = NEW.route_stop_id;

    IF sch_route_id IS NULL OR rs_route_id IS NULL OR sch_route_id != rs_route_id THEN
        RAISE EXCEPTION 'Foreign key integrity violation: Route stop (%) does not belong to the schedule route (%)', 
            NEW.route_stop_id, sch_route_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE TRIGGER enforce_schedule_stop_time_route_match
    BEFORE INSERT OR UPDATE ON public.schedule_stop_times
    FOR EACH ROW EXECUTE FUNCTION public.validate_schedule_stop_time();

-- 12. announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('general', 'delay', 'route_change', 'stop_closure', 'cancellation')) DEFAULT 'general',
    route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
    bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'published',
    publish_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER update_announcements_modtime
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13. audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance and Full-Text Search Indices
CREATE INDEX IF NOT EXISTS idx_buses_college_status ON public.buses(college_id, status);
CREATE INDEX IF NOT EXISTS idx_stops_college_status ON public.stops(college_id, status);
CREATE INDEX IF NOT EXISTS idx_stops_name_lower ON public.stops(college_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_stops_name_trgm ON public.stops USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_routes_college_status ON public.routes(college_id, status);
CREATE INDEX IF NOT EXISTS idx_route_stops_route ON public.route_stops(route_id, stop_sequence);
CREATE INDEX IF NOT EXISTS idx_route_stops_stop ON public.route_stops(stop_id);
CREATE INDEX IF NOT EXISTS idx_schedules_route ON public.schedules(route_id, service_period, status);
CREATE INDEX IF NOT EXISTS idx_schedule_stop_times_schedule ON public.schedule_stop_times(schedule_id);
CREATE INDEX IF NOT EXISTS idx_announcements_feed ON public.announcements(college_id, status, publish_at DESC);
