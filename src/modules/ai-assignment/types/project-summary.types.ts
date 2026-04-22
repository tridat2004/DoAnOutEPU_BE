export interface AiProjectSummaryPayload {
  project: {
    id: string;
    name: string;
    projectKey: string;
    description: string | null;
  };
  taskSummary: {
    totalTasks: number;
    byStatus: Array<{
      code: string;
      name: string;
      count: number;
    }>;
  };
  prioritySummary: Array<{
    code: string;
    name: string;
    count: number;
  }>;
  workloadSummary: Array<{
    fullName: string;
    role: string;
    totalAssignedTasks: number;
    openTasks: number;
    doneTasks: number;
  }>;
  dueSummary: {
    overdueTasks: number;
    dueToday: number;
    dueThisWeek: number;
  };
  aiUsageSummary: {
    totalRecommendations: number;
    latestRecommendation: {
      taskCode: string;
      recommendedUserFullName: string;
      finalScore: number;
      reasonText: string | null;
      createdAt: string;
    } | null;
  };
  recentActivities: Array<{
    fieldName: string;
    oldValue: string | null;
    newValue: string | null;
    taskCode: string;
    taskTitle: string;
    changedByFullName: string;
    createdAt: string;
  }>;
}

export interface AiProjectSummaryResponse {
  overallSummary: string;
  projectHealth: 'good' | 'medium' | 'at_risk';
  topRisks: string[];
  teamWorkloadSummary: string;
  recommendedActions: string[];
  shortPMSummary: string;
}