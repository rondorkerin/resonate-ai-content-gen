CREATE TABLE content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT CHECK (type IN ('research_note', 'outline', 'draft', 'final')) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'HITL')) DEFAULT 'pending',
    data JSONB, -- Stores the actual content in JSON format
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'HITL')) DEFAULT 'pending',
    dependencies UUID[], -- Array of action IDs that must be completed before this action
    content_id UUID REFERENCES content(id) ON DELETE CASCADE, -- Content being processed
    output JSONB, -- Stores any outputs generated by the action
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE input_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    source_type TEXT CHECK (source_type IN ('form', 'community_post', 'file_upload', 'voice_note')),
    source_data JSONB, -- Stores additional data about the source, e.g., URLs, metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT, -- Original content or reference text
    embedding VECTOR, -- Vector type for fast retrieval (requires Postgres extension)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transformation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    action_id UUID REFERENCES actions(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('completed', 'error', 'HITL')) DEFAULT 'completed',
    output JSONB, -- Stores the transformation result or output
    error_message TEXT, -- If an error occurs, store the error message
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID REFERENCES actions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    assignment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    feedback TEXT -- Stores any feedback provided by the user
);
