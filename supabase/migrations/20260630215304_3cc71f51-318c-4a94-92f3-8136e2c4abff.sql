
ALTER TABLE public.approval_requests
  ADD COLUMN target_type text NOT NULL DEFAULT 'pricing_preset',
  ADD COLUMN target_id uuid;

UPDATE public.approval_requests SET target_id = cotacao_id WHERE target_id IS NULL;

ALTER TABLE public.approval_requests
  ALTER COLUMN cotacao_id DROP NOT NULL,
  ALTER COLUMN target_id SET NOT NULL;

CREATE INDEX approval_requests_target_idx ON public.approval_requests(target_type, target_id);
CREATE INDEX approval_requests_requester_idx ON public.approval_requests(requester_id);
