import { createRouter, createWebHashHistory } from "vue-router";
import { authState } from "@/lib/auth";
import { loadSettings } from "@/stores/settings";
import { useWorkspaceStore } from "@/stores/workspace";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      component: () => import("@/pages/landing/index.vue"),
    },
    {
      path: "/login",
      redirect: { path: "/", query: { login: "1" } },
    },
    {
      path: "/home",
      meta: { requiresAuth: true },
      component: () => import("@/pages/home/index.vue"),
    },
    {
      path: "/canvas",
      redirect: "/workspace",
    },
    {
      path: "/workspace",
      meta: { requiresAuth: true },
      component: () => import("@/pages/workspace/index.vue"),
    },
  ],
});
router.beforeEach(async to => {
  if (!to.meta.requiresAuth) return true;
  if (!authState.authenticated) return { path: "/", query: { login: "1" }, replace: true };
  await loadSettings();
  if (to.path === "/workspace") {
    const workspace = useWorkspaceStore();
    if (!workspace.project) {
      await workspace.loadProjectList();
      const recent = workspace.projectList[0];
      if (!recent) return { path: "/home", replace: true };
      await workspace.openProject(recent.id);
    }
  }
  return true;
});
export default router;
