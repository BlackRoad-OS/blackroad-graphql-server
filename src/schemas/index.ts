/**
 * GraphQL Schema Definitions
 *
 * Unified schema for Projects, CRM, and Multi-Cloud Integrations
 */

export const typeDefs = /* GraphQL */ `
  scalar DateTime
  scalar JSON
  scalar UUID

  # =============================================================================
  # Core Types
  # =============================================================================

  type Query {
    # Projects (Salesforce-like)
    projects(filter: ProjectFilter, pagination: PaginationInput): ProjectConnection!
    project(id: ID!): Project
    projectBySlug(slug: String!): Project

    # CRM State Management
    crmRecords(objectType: String!, filter: CRMFilter): CRMRecordConnection!
    crmRecord(objectType: String!, id: ID!): CRMRecord
    crmState(key: String!): CRMState

    # Multi-Cloud Resources
    cloudResources(provider: CloudProvider): [CloudResource!]!
    cloudResource(provider: CloudProvider!, id: ID!): CloudResource

    # Agent System
    agents: [Agent!]!
    agent(id: ID!): Agent
    agentTasks(agentId: ID!): [AgentTask!]!
    todos(projectId: ID): [Todo!]!

    # Integrations Health
    integrationHealth: IntegrationHealth!

    # Hash Operations
    verifyHash(input: String!, hash: String!, algorithm: HashAlgorithm!): Boolean!
  }

  type Mutation {
    # Projects
    createProject(input: CreateProjectInput!): Project!
    updateProject(id: ID!, input: UpdateProjectInput!): Project!
    deleteProject(id: ID!): Boolean!
    syncProjectToSalesforce(id: ID!): SyncResult!
    syncProjectFromGitHub(repoUrl: String!): Project!

    # CRM Operations
    createCRMRecord(objectType: String!, input: JSON!): CRMRecord!
    updateCRMRecord(objectType: String!, id: ID!, input: JSON!): CRMRecord!
    deleteCRMRecord(objectType: String!, id: ID!): Boolean!
    syncCRMState(key: String!, value: JSON!): CRMState!

    # Cloud Operations
    deployToCloud(provider: CloudProvider!, input: DeployInput!): DeploymentResult!
    scaleResource(provider: CloudProvider!, id: ID!, replicas: Int!): CloudResource!
    deleteCloudResource(provider: CloudProvider!, id: ID!): Boolean!

    # Agent Operations
    createAgent(input: CreateAgentInput!): Agent!
    updateAgent(id: ID!, input: UpdateAgentInput!): Agent!
    executeAgentTask(agentId: ID!, task: String!): AgentTaskResult!

    # Todo Operations
    createTodo(input: CreateTodoInput!): Todo!
    updateTodo(id: ID!, input: UpdateTodoInput!): Todo!
    completeTodo(id: ID!): Todo!
    deleteTodo(id: ID!): Boolean!

    # Hash Operations
    generateHash(input: String!, algorithm: HashAlgorithm!): HashResult!
    generateShaInfinityHash(input: String!, iterations: Int): ShaInfinityResult!

    # iOS Tools Integration
    triggerWorkingCopy(action: WorkingCopyAction!, params: JSON): IOSToolResult!
    triggerPyto(script: String!, args: [String!]): IOSToolResult!
    triggerShellfish(command: String!): IOSToolResult!
  }

  type Subscription {
    projectUpdated(id: ID!): Project!
    crmStateChanged(key: String!): CRMState!
    deploymentProgress(deploymentId: ID!): DeploymentProgress!
    agentTaskProgress(taskId: ID!): AgentTaskProgress!
  }

  # =============================================================================
  # Project Types (Salesforce-like)
  # =============================================================================

  type Project {
    id: ID!
    name: String!
    slug: String!
    description: String
    status: ProjectStatus!
    priority: Priority!
    category: String

    # Ownership
    ownerId: ID
    teamId: ID
    organizationId: ID

    # Metadata
    tags: [String!]!
    customFields: JSON

    # Git Integration
    gitRepository: GitRepository

    # CRM Links
    salesforceId: String
    crmRecordId: String

    # Cloud Deployments
    deployments: [Deployment!]!

    # Todos & Tasks
    todos: [Todo!]!

    # Hashes for integrity
    contentHash: String
    stateHash: String

    # Timestamps
    createdAt: DateTime!
    updatedAt: DateTime!
    startDate: DateTime
    dueDate: DateTime
  }

  type ProjectConnection {
    edges: [ProjectEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type ProjectEdge {
    node: Project!
    cursor: String!
  }

  enum ProjectStatus {
    DRAFT
    PLANNING
    IN_PROGRESS
    REVIEW
    TESTING
    DEPLOYED
    COMPLETED
    ON_HOLD
    CANCELLED
  }

  enum Priority {
    CRITICAL
    HIGH
    MEDIUM
    LOW
    NONE
  }

  input CreateProjectInput {
    name: String!
    slug: String
    description: String
    status: ProjectStatus
    priority: Priority
    category: String
    tags: [String!]
    customFields: JSON
    gitRepositoryUrl: String
    startDate: DateTime
    dueDate: DateTime
  }

  input UpdateProjectInput {
    name: String
    slug: String
    description: String
    status: ProjectStatus
    priority: Priority
    category: String
    tags: [String!]
    customFields: JSON
    startDate: DateTime
    dueDate: DateTime
  }

  input ProjectFilter {
    status: [ProjectStatus!]
    priority: [Priority!]
    category: String
    tags: [String!]
    search: String
    ownerId: ID
    teamId: ID
  }

  # =============================================================================
  # CRM Types
  # =============================================================================

  type CRMRecord {
    id: ID!
    objectType: String!
    externalId: String
    salesforceId: String
    data: JSON!
    metadata: JSON
    syncStatus: SyncStatus!
    lastSyncedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type CRMRecordConnection {
    edges: [CRMRecordEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type CRMRecordEdge {
    node: CRMRecord!
    cursor: String!
  }

  type CRMState {
    key: String!
    value: JSON!
    hash: String!
    version: Int!
    cloudflareKVId: String
    updatedAt: DateTime!
  }

  input CRMFilter {
    externalId: String
    salesforceId: String
    syncStatus: SyncStatus
    search: String
  }

  enum SyncStatus {
    SYNCED
    PENDING
    FAILED
    CONFLICT
    LOCAL_ONLY
    REMOTE_ONLY
  }

  type SyncResult {
    success: Boolean!
    message: String
    salesforceId: String
    errors: [String!]
  }

  # =============================================================================
  # Cloud Resource Types
  # =============================================================================

  enum CloudProvider {
    CLOUDFLARE
    VERCEL
    DIGITALOCEAN
    AWS
    GCP
    AZURE
  }

  type CloudResource {
    id: ID!
    provider: CloudProvider!
    type: String!
    name: String!
    status: ResourceStatus!
    region: String
    config: JSON
    metrics: JSON
    url: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum ResourceStatus {
    CREATING
    ACTIVE
    UPDATING
    SCALING
    STOPPING
    STOPPED
    DELETING
    DELETED
    ERROR
  }

  input DeployInput {
    projectId: ID!
    environment: String!
    config: JSON
    gitRef: String
  }

  type DeploymentResult {
    success: Boolean!
    deploymentId: ID!
    url: String
    message: String
    errors: [String!]
  }

  type Deployment {
    id: ID!
    provider: CloudProvider!
    environment: String!
    status: DeploymentStatus!
    url: String
    gitRef: String
    config: JSON
    logs: [String!]
    createdAt: DateTime!
    completedAt: DateTime
  }

  enum DeploymentStatus {
    QUEUED
    BUILDING
    DEPLOYING
    READY
    FAILED
    CANCELLED
  }

  type DeploymentProgress {
    deploymentId: ID!
    status: DeploymentStatus!
    progress: Int!
    currentStep: String
    logs: [String!]
  }

  # =============================================================================
  # Git Integration Types
  # =============================================================================

  type GitRepository {
    id: ID!
    provider: GitProvider!
    owner: String!
    name: String!
    fullName: String!
    url: String!
    defaultBranch: String!
    isPrivate: Boolean!
    branches: [GitBranch!]
    latestCommit: GitCommit
  }

  enum GitProvider {
    GITHUB
    GITLAB
    BITBUCKET
  }

  type GitBranch {
    name: String!
    sha: String!
    protected: Boolean!
  }

  type GitCommit {
    sha: String!
    message: String!
    author: String!
    date: DateTime!
  }

  # =============================================================================
  # Agent System Types
  # =============================================================================

  type Agent {
    id: ID!
    name: String!
    type: AgentType!
    status: AgentStatus!
    capabilities: [String!]!
    configuration: JSON
    instructions: String
    currentTask: AgentTask
    taskHistory: [AgentTask!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum AgentType {
    CLAUDE
    CUSTOM
    WEBHOOK
    SCHEDULED
  }

  enum AgentStatus {
    IDLE
    RUNNING
    PAUSED
    ERROR
    DISABLED
  }

  type AgentTask {
    id: ID!
    agentId: ID!
    task: String!
    status: TaskStatus!
    result: JSON
    error: String
    startedAt: DateTime
    completedAt: DateTime
    createdAt: DateTime!
  }

  enum TaskStatus {
    PENDING
    IN_PROGRESS
    COMPLETED
    FAILED
    CANCELLED
  }

  type AgentTaskResult {
    taskId: ID!
    success: Boolean!
    result: JSON
    error: String
  }

  type AgentTaskProgress {
    taskId: ID!
    status: TaskStatus!
    progress: Int!
    currentStep: String
    output: String
  }

  input CreateAgentInput {
    name: String!
    type: AgentType!
    capabilities: [String!]!
    configuration: JSON
    instructions: String
  }

  input UpdateAgentInput {
    name: String
    status: AgentStatus
    capabilities: [String!]
    configuration: JSON
    instructions: String
  }

  # =============================================================================
  # Todo Types
  # =============================================================================

  type Todo {
    id: ID!
    projectId: ID
    title: String!
    description: String
    status: TodoStatus!
    priority: Priority!
    assigneeId: ID
    dueDate: DateTime
    tags: [String!]!
    hash: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    completedAt: DateTime
  }

  enum TodoStatus {
    PENDING
    IN_PROGRESS
    COMPLETED
    BLOCKED
    CANCELLED
  }

  input CreateTodoInput {
    projectId: ID
    title: String!
    description: String
    priority: Priority
    assigneeId: ID
    dueDate: DateTime
    tags: [String!]
  }

  input UpdateTodoInput {
    title: String
    description: String
    status: TodoStatus
    priority: Priority
    assigneeId: ID
    dueDate: DateTime
    tags: [String!]
  }

  # =============================================================================
  # Hash Types
  # =============================================================================

  enum HashAlgorithm {
    SHA256
    SHA384
    SHA512
    SHA3_256
    SHA3_512
    SHA_INFINITY
    BLAKE3
  }

  type HashResult {
    input: String!
    hash: String!
    algorithm: HashAlgorithm!
    timestamp: DateTime!
  }

  type ShaInfinityResult {
    input: String!
    hash: String!
    iterations: Int!
    algorithm: String!
    keyLength: Int!
    timestamp: DateTime!
    verificationHash: String!
  }

  # =============================================================================
  # iOS Tools Types
  # =============================================================================

  enum WorkingCopyAction {
    CLONE
    PULL
    PUSH
    COMMIT
    CHECKOUT
    STATUS
  }

  type IOSToolResult {
    success: Boolean!
    tool: String!
    action: String!
    output: JSON
    callbackUrl: String
    error: String
  }

  # =============================================================================
  # Integration Health Types
  # =============================================================================

  type IntegrationHealth {
    cloudflare: IntegrationStatus!
    salesforce: IntegrationStatus!
    vercel: IntegrationStatus!
    digitalocean: IntegrationStatus!
    anthropic: IntegrationStatus!
    github: IntegrationStatus!
    termius: IntegrationStatus!
    iosTools: IntegrationStatus!
    overall: HealthStatus!
    timestamp: DateTime!
  }

  type IntegrationStatus {
    enabled: Boolean!
    connected: Boolean!
    lastChecked: DateTime
    latency: Int
    error: String
  }

  enum HealthStatus {
    HEALTHY
    DEGRADED
    UNHEALTHY
  }

  # =============================================================================
  # Common Types
  # =============================================================================

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  input PaginationInput {
    first: Int
    after: String
    last: Int
    before: String
  }
`;
