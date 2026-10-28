-- RouteReady Campus - Row Level Security (RLS) Policies
-- Phase 2: Role-based authorization, multi-tenant college isolation, and audit security

-- 1. Helper function: Get currently authenticated user's role (secure, cached, fixed search_path)
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Helper function: Get currently authenticated user's college_id
CREATE OR REPLACE FUNCTION public.get_auth_college_id()
RETURNS UUID AS $$
    SELECT college_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- 3. Helper function: Check if currently authenticated user is an administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Enable RLS on all public tables
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_stop_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to ensure clean re-application
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- -------------------------------------------------------------
-- 1. COLLEGES POLICIES
-- -------------------------------------------------------------
-- Anyone (including public landing page visitors) can view colleges
CREATE POLICY "Allow public read of colleges"
    ON public.colleges FOR SELECT
    USING (true);

-- Only admins of that college can update college information
CREATE POLICY "Allow admins to update own college"
    ON public.colleges FOR UPDATE
    USING (id = public.get_auth_college_id() AND public.is_admin())
    WITH CHECK (id = public.get_auth_college_id() AND public.is_admin());

-- -------------------------------------------------------------
-- 2. PROFILES POLICIES
-- -------------------------------------------------------------
-- Users can read own profile; admins can read profiles within their college
CREATE POLICY "Users can view own profile or admins view college profiles"
    ON public.profiles FOR SELECT
    USING (
        id = auth.uid() 
        OR (public.is_admin() AND college_id = public.get_auth_college_id())
    );

-- Users can update their own profile; triggers enforce role/college immutability
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Allow service role or auth trigger to insert new user profiles
CREATE POLICY "Allow profile creation on signup"
    ON public.profiles FOR INSERT
    WITH CHECK (
        id = auth.uid() 
        OR (public.is_admin() AND college_id = public.get_auth_college_id())
    );

-- -------------------------------------------------------------
-- 3. BUSES POLICIES
-- -------------------------------------------------------------
-- Students & unauthenticated users can view active buses in their college
-- Admins can view all buses in their college
CREATE POLICY "View buses in user college"
    ON public.buses FOR SELECT
    USING (
        (
            college_id = COALESCE(public.get_auth_college_id(), 'c0000000-0000-0000-0000-000000000001'::uuid)
            AND (status = 'active' OR public.is_admin())
        )
    );

CREATE POLICY "Admins can insert buses for their college"
    ON public.buses FOR INSERT
    WITH CHECK (public.is_admin() AND college_id = public.get_auth_college_id());

CREATE POLICY "Admins can update buses in their college"
    ON public.buses FOR UPDATE
    USING (public.is_admin() AND college_id = public.get_auth_college_id())
    WITH CHECK (public.is_admin() AND college_id = public.get_auth_college_id());

CREATE POLICY "Admins can delete buses in their college"
    ON public.buses FOR DELETE
    USING (public.is_admin() AND college_id = public.get_auth_college_id());

-- -------------------------------------------------------------
-- 4. STOPS POLICIES
-- -------------------------------------------------------------
CREATE POLICY "View stops in user college"
    ON public.stops FOR SELECT
    USING (
        (
            college_id = COALESCE(public.get_auth_college_id(), 'c0000000-0000-0000-0000-000000000001'::uuid)
            AND (status = 'active' OR public.is_admin())
        )
    );

CREATE POLICY "Admins can insert stops for their college"
    ON public.stops FOR INSERT
    WITH CHECK (public.is_admin() AND college_id = public.get_auth_college_id());

CREATE POLICY "Admins can update stops in their college"
    ON public.stops FOR UPDATE
    USING (public.is_admin() AND college_id = public.get_auth_college_id())
    WITH CHECK (public.is_admin() AND college_id = public.get_auth_college_id());

CREATE POLICY "Admins can delete stops in their college"
    ON public.stops FOR DELETE
    USING (public.is_admin() AND college_id = public.get_auth_college_id());

-- -------------------------------------------------------------
-- 5. ROUTES POLICIES
-- -------------------------------------------------------------
CREATE POLICY "View routes in user college"
    ON public.routes FOR SELECT
    USING (
        (
            college_id = COALESCE(public.get_auth_college_id(), 'c0000000-0000-0000-0000-000000000001'::uuid)
            AND (status = 'active' OR public.is_admin())
        )
    );

CREATE POLICY "Admins can insert routes for their college"
    ON public.routes FOR INSERT
    WITH CHECK (public.is_admin() AND college_id = public.get_auth_college_id());

CREATE POLICY "Admins can update routes in their college"
    ON public.routes FOR UPDATE
    USING (public.is_admin() AND college_id = public.get_auth_college_id())
    WITH CHECK (public.is_admin() AND college_id = public.get_auth_college_id());

CREATE POLICY "Admins can delete routes in their college"
    ON public.routes FOR DELETE
    USING (public.is_admin() AND college_id = public.get_auth_college_id());

-- -------------------------------------------------------------
-- 6. ROUTE STOPS POLICIES
-- -------------------------------------------------------------
CREATE POLICY "View route stops for accessible routes"
    ON public.route_stops FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.routes r 
            WHERE r.id = route_stops.route_id 
            AND r.college_id = COALESCE(public.get_auth_college_id(), 'c0000000-0000-0000-0000-000000000001'::uuid)
            AND (r.status = 'active' OR public.is_admin())
        )
    );

CREATE POLICY "Admins can manage route stops"
    ON public.route_stops FOR ALL
    USING (
        public.is_admin() AND EXISTS (
            SELECT 1 FROM public.routes r 
            WHERE r.id = route_stops.route_id AND r.college_id = public.get_auth_college_id()
        )
    )
    WITH CHECK (
        public.is_admin() AND EXISTS (
            SELECT 1 FROM public.routes r 
            WHERE r.id = route_stops.route_id AND r.college_id = public.get_auth_college_id()
        )
    );

-- -------------------------------------------------------------
-- 7. ROUTE BUSES POLICIES
-- -------------------------------------------------------------
CREATE POLICY "View route buses for accessible routes"
    ON public.route_buses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.routes r 
            WHERE r.id = route_buses.route_id 
            AND r.college_id = COALESCE(public.get_auth_college_id(), 'c0000000-0000-0000-0000-000000000001'::uuid)
            AND (r.status = 'active' OR public.is_admin())
        )
    );

CREATE POLICY "Admins can manage route buses"
    ON public.route_buses FOR ALL
    USING (
        public.is_admin() AND EXISTS (
            SELECT 1 FROM public.routes r 
            WHERE r.id = route_buses.route_id AND r.college_id = public.get_auth_college_id()
        )
    )
    WITH CHECK (
        public.is_admin() AND EXISTS (
            SELECT 1 FROM public.routes r 
            WHERE r.id = route_buses.route_id AND r.college_id = public.get_auth_college_id()
        )
    );

-- -------------------------------------------------------------
-- 8. SCHEDULES POLICIES
-- -------------------------------------------------------------
CREATE POLICY "View schedules for accessible routes"
    ON public.schedules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.routes r 
            WHERE r.id = schedules.route_id 
            AND r.college_id = COALESCE(public.get_auth_college_id(), 'c0000000-0000-0000-0000-000000000001'::uuid)
            AND (schedules.status = 'active' OR public.is_admin())
        )
    );

CREATE POLICY "Admins can manage schedules"
    ON public.schedules FOR ALL
    USING (
        public.is_admin() AND EXISTS (
            SELECT 1 FROM public.routes r 
            WHERE r.id = schedules.route_id AND r.college_id = public.get_auth_college_id()
        )
    )
    WITH CHECK (
        public.is_admin() AND EXISTS (
            SELECT 1 FROM public.routes r 
            WHERE r.id = schedules.route_id AND r.college_id = public.get_auth_college_id()
        )
    );

-- -------------------------------------------------------------
-- 9. SCHEDULE STOP TIMES POLICIES
-- -------------------------------------------------------------
CREATE POLICY "View schedule stop times for accessible schedules"
    ON public.schedule_stop_times FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.schedules s
            JOIN public.routes r ON r.id = s.route_id
            WHERE s.id = schedule_stop_times.schedule_id
            AND r.college_id = COALESCE(public.get_auth_college_id(), 'c0000000-0000-0000-0000-000000000001'::uuid)
            AND (s.status = 'active' OR public.is_admin())
        )
    );

CREATE POLICY "Admins can manage schedule stop times"
    ON public.schedule_stop_times FOR ALL
    USING (
        public.is_admin() AND EXISTS (
            SELECT 1 FROM public.schedules s 
            JOIN public.routes r ON r.id = s.route_id
            WHERE s.id = schedule_stop_times.schedule_id AND r.college_id = public.get_auth_college_id()
        )
    )
    WITH CHECK (
        public.is_admin() AND EXISTS (
            SELECT 1 FROM public.schedules s 
            JOIN public.routes r ON r.id = s.route_id
            WHERE s.id = schedule_stop_times.schedule_id AND r.college_id = public.get_auth_college_id()
        )
    );

-- -------------------------------------------------------------
-- 10. ANNOUNCEMENTS POLICIES
-- -------------------------------------------------------------
CREATE POLICY "Public or students can view published announcements in their college"
    ON public.announcements FOR SELECT
    USING (
        college_id = COALESCE(public.get_auth_college_id(), 'c0000000-0000-0000-0000-000000000001'::uuid)
        AND (
            (status = 'published' AND publish_at <= NOW() AND (expires_at IS NULL OR expires_at > NOW()))
            OR public.is_admin()
        )
    );

CREATE POLICY "Admins can manage announcements"
    ON public.announcements FOR ALL
    USING (public.is_admin() AND college_id = public.get_auth_college_id())
    WITH CHECK (public.is_admin() AND college_id = public.get_auth_college_id());

-- -------------------------------------------------------------
-- 11. AUDIT LOGS POLICIES
-- -------------------------------------------------------------
-- Only administrators can view audit logs
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin());

-- Insert into audit logs permitted for backend service role or authenticated actions
CREATE POLICY "Allow server-side audit insertion"
    ON public.audit_logs FOR INSERT
    WITH CHECK (true);
