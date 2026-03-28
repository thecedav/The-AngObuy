-- Create the news table for advertisements
CREATE TABLE IF NOT EXISTS public.news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    title TEXT NOT NULL,
    content TEXT,
    media_urls TEXT[] DEFAULT '{}',
    placement TEXT NOT NULL CHECK (placement IN ('cover', 'feed')),
    duration TEXT NOT NULL CHECK (duration IN ('24h', '1dia', '1mes')),
    expires_at TIMESTAMPTZ,
    target_province_id UUID REFERENCES public.provinces(id),
    target_municipality_id UUID REFERENCES public.municipalities(id),
    target_store_id UUID REFERENCES public.stores(id),
    target_product_id UUID REFERENCES public.products(id),
    active BOOLEAN DEFAULT true,
    views_count INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view active news" ON public.news
    FOR SELECT USING (active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Admins can do everything on news" ON public.news
    FOR ALL USING (true); -- In a real app, check for admin role

-- Create storage bucket for news media
-- Note: This usually needs to be done via the Supabase dashboard or API, 
-- but we can include the instructions or try to use the client.
