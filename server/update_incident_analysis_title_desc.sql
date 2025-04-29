-- Add title and description columns to incident_analysis for AI cache validation
ALTER TABLE public.incident_analysis
ADD COLUMN title text,
ADD COLUMN description text;