-- Break recursion between approval_decisions and approval_requests policies
CREATE OR REPLACE FUNCTION public.is_approval_requester(_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.approval_requests r
    WHERE r.id = _request_id AND r.requester_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_approval_approver(_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.approval_decisions d
    WHERE d.request_id = _request_id AND d.approver_user_id = auth.uid()
  )
$$;

REVOKE ALL ON FUNCTION public.is_approval_requester(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_approval_approver(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_approval_requester(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approval_approver(uuid) TO authenticated;

DROP POLICY IF EXISTS approval_decisions_read ON public.approval_decisions;
CREATE POLICY approval_decisions_read ON public.approval_decisions
FOR SELECT TO authenticated
USING (
  approver_user_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR public.is_approval_requester(request_id)
);

DROP POLICY IF EXISTS approval_requests_read_own_or_admin_or_approver ON public.approval_requests;
CREATE POLICY approval_requests_read_own_or_admin_or_approver ON public.approval_requests
FOR SELECT TO authenticated
USING (
  requester_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR public.is_approval_approver(id)
);