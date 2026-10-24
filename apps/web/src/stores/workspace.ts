import { defineStore } from "pinia";
import { ref } from "vue";
import axios from "axios";
import type { AgentAttachment } from "@/components/agent/types";

export type Project = {
  id: string;
  directory: string;
  name: string;
  lastOpenedAt: number;
};

export const useWorkspaceStore = defineStore("workspace", () => {
  const project = ref<Project | null>(null);
  const projectList = ref<Project[]>([]);
  const projectLoading = ref(false);
  const projectLoadingDrawn = ref(false);
  const projectLoadingVisible = ref(false);
  const pendingAgentMessage = ref<{ directory: string; prompt: string; attachments?: AgentAttachment[]; model: string; reasoningEffort: string } | null>(null);

  async function loadProjectList(signal?: AbortSignal) {
    const { data } = await axios.get<{ code: number; data: Project[]; message?: string }>("/api/projects/list", { signal });
    if (data.code !== 200 || !Array.isArray(data.data)) throw new Error(data.message || "读取项目列表失败");
    projectList.value = data.data;
    if (project.value && !projectList.value.some(item => item.id === project.value?.id)) project.value = null;
    return projectList.value;
  }

  async function createProject(name: string, signal?: AbortSignal, initializeCanvas = true) {
    const { data } = await axios.post<{ code: number; data: Project; message?: string }>("/api/projects/create", { name, initializeCanvas }, { signal });
    if (data.code !== 200 && data.code !== 201) throw new Error(data.message || "创建项目失败");
    projectList.value = [data.data, ...projectList.value.filter(item => item.id !== data.data.id)];
    project.value = data.data;
    pendingAgentMessage.value = null;
    return data.data;
  }

  async function openProject(projectId: string, signal?: AbortSignal) {
    const { data } = await axios.post<{ code: number; data: Project; message?: string }>("/api/projects/open", { id: projectId }, { signal });
    if (data.code !== 200) throw new Error(data.message || "打开项目失败");
    projectList.value = [data.data, ...projectList.value.filter(item => item.id !== data.data.id)];
    project.value = data.data;
    pendingAgentMessage.value = null;
    return data.data;
  }

  async function renameProject(projectId: string, name: string) {
    const { data } = await axios.put<{ code: number; data: Project; message?: string }>("/api/projects/rename", { id: projectId, name });
    if (data.code !== 200) throw new Error(data.message || "重命名项目失败");
    projectList.value = projectList.value.map(item => item.id === projectId ? data.data : item);
    if (project.value?.id === projectId) project.value = data.data;
    return data.data;
  }

  async function removeProject(projectId: string) {
    await axios.delete("/api/projects/archive", { data: { id: projectId } });
    projectList.value = projectList.value.filter(item => item.id !== projectId);
    if (project.value?.id === projectId) project.value = null;
  }

  return {
    project,
    projectList,
    projectLoading,
    projectLoadingDrawn,
    projectLoadingVisible,
    pendingAgentMessage,
    loadProjectList,
    createProject,
    openProject,
    renameProject,
    removeProject,
  };
});
