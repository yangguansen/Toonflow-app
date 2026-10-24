import { createRouter, createWebHashHistory } from "vue-router";
import { authState } from "@/lib/auth";
import { loadSettings } from "@/stores/settings";
import { useWorkspaceStore } from "@/stores/workspace";
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      redirect: "/home",
    },
    {
      path: "/login",
      meta: { public: true },
      component: () => import("@/pages/login/index.vue"),
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
  if (to.meta.public) return authState.authenticated ? { path: "/home", replace: true } : true;
  if (!authState.authenticated) return { path: "/login", replace: true };
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
