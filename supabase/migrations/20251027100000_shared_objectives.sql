-- Phase 4.3: Shared Objectives Board with Authentication and Real-time Collaboration

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for storing shared objectives
CREATE TABLE IF NOT EXISTS public.shared_objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'completed'
  created_by UUID, -- User ID from auth.users
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  agent_role TEXT DEFAULT 'general',
  ai_insights TEXT,
  is_public BOOLEAN DEFAULT false, -- Whether objective is publicly visible
  archived BOOLEAN DEFAULT false
);

-- Table for tasks within shared objectives
CREATE TABLE IF NOT EXISTS public.shared_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  objective_id UUID NOT NULL REFERENCES public.shared_objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'executing', 'completed'
  priority INTEGER NOT NULL DEFAULT 5,
  category TEXT,
  estimated_time TEXT,
  result TEXT,
  parent_id UUID REFERENCES public.shared_tasks(id) ON DELETE CASCADE, -- For subtasks
  is_collapsed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID, -- User ID from auth.users
  created_by UUID -- User who created the task
);

-- Table for objective permissions and collaborators
CREATE TABLE IF NOT EXISTS public.objective_collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  objective_id UUID NOT NULL REFERENCES public.shared_objectives(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- User ID from auth.users
  role TEXT NOT NULL DEFAULT 'viewer', -- 'owner', 'editor', 'viewer'
  invited_by UUID, -- User who invited this collaborator
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(objective_id, user_id)
);

-- Table for real-time activity feed
CREATE TABLE IF NOT EXISTS public.objective_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  objective_id UUID NOT NULL REFERENCES public.shared_objectives(id) ON DELETE CASCADE,
  user_id UUID, -- User who performed the action
  action_type TEXT NOT NULL, -- 'created', 'updated', 'completed', 'task_added', 'task_completed', 'comment_added', 'user_invited'
  action_data JSONB, -- Additional data about the action
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for comments on objectives and tasks
CREATE TABLE IF NOT EXISTS public.objective_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  objective_id UUID NOT NULL REFERENCES public.shared_objectives(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.shared_tasks(id) ON DELETE CASCADE, -- Optional, for task-specific comments
  user_id UUID NOT NULL, -- User who posted the comment
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted BOOLEAN DEFAULT false
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_shared_objectives_created_by ON public.shared_objectives(created_by);
CREATE INDEX IF NOT EXISTS idx_shared_objectives_status ON public.shared_objectives(status);
CREATE INDEX IF NOT EXISTS idx_shared_objectives_archived ON public.shared_objectives(archived);
CREATE INDEX IF NOT EXISTS idx_shared_tasks_objective_id ON public.shared_tasks(objective_id);
CREATE INDEX IF NOT EXISTS idx_shared_tasks_status ON public.shared_tasks(status);
CREATE INDEX IF NOT EXISTS idx_shared_tasks_parent_id ON public.shared_tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_objective_collaborators_user_id ON public.objective_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_objective_collaborators_objective_id ON public.objective_collaborators(objective_id);
CREATE INDEX IF NOT EXISTS idx_objective_activity_objective_id ON public.objective_activity(objective_id);
CREATE INDEX IF NOT EXISTS idx_objective_comments_objective_id ON public.objective_comments(objective_id);
CREATE INDEX IF NOT EXISTS idx_objective_comments_task_id ON public.objective_comments(task_id);

-- Enable Row Level Security
ALTER TABLE public.shared_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shared_objectives

-- Users can view objectives they created, are collaborating on, or are public
CREATE POLICY "Users can view their own and collaborated objectives"
ON public.shared_objectives FOR SELECT
USING (
  auth.uid() = created_by OR
  is_public = true OR
  EXISTS (
    SELECT 1 FROM public.objective_collaborators
    WHERE objective_collaborators.objective_id = shared_objectives.id
    AND objective_collaborators.user_id = auth.uid()
  )
);

-- Users can insert their own objectives
CREATE POLICY "Users can create objectives"
ON public.shared_objectives FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Users can update objectives they own or have editor access to
CREATE POLICY "Users can update their own objectives"
ON public.shared_objectives FOR UPDATE
USING (
  auth.uid() = created_by OR
  EXISTS (
    SELECT 1 FROM public.objective_collaborators
    WHERE objective_collaborators.objective_id = shared_objectives.id
    AND objective_collaborators.user_id = auth.uid()
    AND objective_collaborators.role IN ('owner', 'editor')
  )
);

-- Users can delete their own objectives
CREATE POLICY "Users can delete their own objectives"
ON public.shared_objectives FOR DELETE
USING (auth.uid() = created_by);

-- RLS Policies for shared_tasks

-- Users can view tasks from objectives they have access to
CREATE POLICY "Users can view tasks from accessible objectives"
ON public.shared_tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shared_objectives
    WHERE shared_objectives.id = shared_tasks.objective_id
    AND (
      shared_objectives.created_by = auth.uid() OR
      shared_objectives.is_public = true OR
      EXISTS (
        SELECT 1 FROM public.objective_collaborators
        WHERE objective_collaborators.objective_id = shared_objectives.id
        AND objective_collaborators.user_id = auth.uid()
      )
    )
  )
);

-- Users can insert tasks in objectives they have edit access to
CREATE POLICY "Users can create tasks in accessible objectives"
ON public.shared_tasks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shared_objectives
    WHERE shared_objectives.id = shared_tasks.objective_id
    AND (
      shared_objectives.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.objective_collaborators
        WHERE objective_collaborators.objective_id = shared_objectives.id
        AND objective_collaborators.user_id = auth.uid()
        AND objective_collaborators.role IN ('owner', 'editor')
      )
    )
  )
);

-- Users can update tasks in objectives they have edit access to
CREATE POLICY "Users can update tasks in accessible objectives"
ON public.shared_tasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.shared_objectives
    WHERE shared_objectives.id = shared_tasks.objective_id
    AND (
      shared_objectives.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.objective_collaborators
        WHERE objective_collaborators.objective_id = shared_objectives.id
        AND objective_collaborators.user_id = auth.uid()
        AND objective_collaborators.role IN ('owner', 'editor')
      )
    )
  )
);

-- Users can delete tasks they created
CREATE POLICY "Users can delete their own tasks"
ON public.shared_tasks FOR DELETE
USING (created_by = auth.uid());

-- RLS Policies for objective_collaborators

-- Users can view collaborators of objectives they have access to
CREATE POLICY "Users can view collaborators of accessible objectives"
ON public.objective_collaborators FOR SELECT
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.shared_objectives
    WHERE shared_objectives.id = objective_collaborators.objective_id
    AND (
      shared_objectives.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.objective_collaborators oc
        WHERE oc.objective_id = shared_objectives.id
        AND oc.user_id = auth.uid()
      )
    )
  )
);

-- Objective owners can add collaborators
CREATE POLICY "Objective owners can add collaborators"
ON public.objective_collaborators FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shared_objectives
    WHERE shared_objectives.id = objective_collaborators.objective_id
    AND shared_objectives.created_by = auth.uid()
  )
);

-- Objective owners can update collaborator roles
CREATE POLICY "Objective owners can update collaborator roles"
ON public.objective_collaborators FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.shared_objectives
    WHERE shared_objectives.id = objective_collaborators.objective_id
    AND shared_objectives.created_by = auth.uid()
  )
);

-- Users can remove themselves or owners can remove anyone
CREATE POLICY "Users can remove themselves or owners can remove collaborators"
ON public.objective_collaborators FOR DELETE
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.shared_objectives
    WHERE shared_objectives.id = objective_collaborators.objective_id
    AND shared_objectives.created_by = auth.uid()
  )
);

-- RLS Policies for objective_activity

-- Users can view activity for objectives they have access to
CREATE POLICY "Users can view activity of accessible objectives"
ON public.objective_activity FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shared_objectives
    WHERE shared_objectives.id = objective_activity.objective_id
    AND (
      shared_objectives.created_by = auth.uid() OR
      shared_objectives.is_public = true OR
      EXISTS (
        SELECT 1 FROM public.objective_collaborators
        WHERE objective_collaborators.objective_id = shared_objectives.id
        AND objective_collaborators.user_id = auth.uid()
      )
    )
  )
);

-- Users can create activity for objectives they have access to
CREATE POLICY "Users can create activity in accessible objectives"
ON public.objective_activity FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shared_objectives
    WHERE shared_objectives.id = objective_activity.objective_id
    AND (
      shared_objectives.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.objective_collaborators
        WHERE objective_collaborators.objective_id = shared_objectives.id
        AND objective_collaborators.user_id = auth.uid()
      )
    )
  )
);

-- RLS Policies for objective_comments

-- Users can view comments on objectives they have access to
CREATE POLICY "Users can view comments on accessible objectives"
ON public.objective_comments FOR SELECT
USING (
  NOT deleted AND
  EXISTS (
    SELECT 1 FROM public.shared_objectives
    WHERE shared_objectives.id = objective_comments.objective_id
    AND (
      shared_objectives.created_by = auth.uid() OR
      shared_objectives.is_public = true OR
      EXISTS (
        SELECT 1 FROM public.objective_collaborators
        WHERE objective_collaborators.objective_id = shared_objectives.id
        AND objective_collaborators.user_id = auth.uid()
      )
    )
  )
);

-- Users can create comments on objectives they have access to
CREATE POLICY "Users can create comments on accessible objectives"
ON public.objective_comments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shared_objectives
    WHERE shared_objectives.id = objective_comments.objective_id
    AND (
      shared_objectives.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.objective_collaborators
        WHERE objective_collaborators.objective_id = shared_objectives.id
        AND objective_collaborators.user_id = auth.uid()
      )
    )
  )
);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
ON public.objective_comments FOR UPDATE
USING (user_id = auth.uid());

-- Users can soft-delete their own comments
CREATE POLICY "Users can delete their own comments"
ON public.objective_comments FOR DELETE
USING (user_id = auth.uid());

-- Triggers for automatic timestamp updates

CREATE OR REPLACE FUNCTION public.update_shared_objectives_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_shared_objectives_updated_at
BEFORE UPDATE ON public.shared_objectives
FOR EACH ROW
EXECUTE FUNCTION public.update_shared_objectives_timestamp();

CREATE OR REPLACE FUNCTION public.update_objective_comments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_objective_comments_updated_at
BEFORE UPDATE ON public.objective_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_objective_comments_timestamp();

-- Function to log activity automatically
CREATE OR REPLACE FUNCTION public.log_objective_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.objective_activity (objective_id, user_id, action_type, action_data)
    VALUES (
      NEW.id,
      NEW.created_by,
      'created',
      jsonb_build_object('title', NEW.title)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'completed' THEN
    INSERT INTO public.objective_activity (objective_id, user_id, action_type, action_data)
    VALUES (
      NEW.id,
      auth.uid(),
      'completed',
      jsonb_build_object('title', NEW.title)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER log_shared_objective_activity
AFTER INSERT OR UPDATE ON public.shared_objectives
FOR EACH ROW
EXECUTE FUNCTION public.log_objective_activity();

-- Function to get user's accessible objectives
CREATE OR REPLACE FUNCTION public.get_user_objectives(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  agent_role TEXT,
  is_public BOOLEAN,
  is_owner BOOLEAN,
  collaborator_role TEXT,
  task_count BIGINT,
  completed_task_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    so.id,
    so.title,
    so.description,
    so.status,
    so.created_by,
    so.created_at,
    so.agent_role,
    so.is_public,
    (so.created_by = user_uuid) as is_owner,
    oc.role as collaborator_role,
    COUNT(st.id) as task_count,
    COUNT(CASE WHEN st.status = 'completed' THEN 1 END) as completed_task_count
  FROM public.shared_objectives so
  LEFT JOIN public.objective_collaborators oc 
    ON so.id = oc.objective_id AND oc.user_id = user_uuid
  LEFT JOIN public.shared_tasks st ON so.id = st.objective_id
  WHERE 
    so.archived = false AND
    (so.created_by = user_uuid OR 
     so.is_public = true OR 
     oc.user_id = user_uuid)
  GROUP BY so.id, so.title, so.description, so.status, so.created_by, 
           so.created_at, so.agent_role, so.is_public, oc.role
  ORDER BY so.created_at DESC;
END;
$$;
