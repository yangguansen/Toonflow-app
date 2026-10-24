import { Router } from "express";
import { z } from "zod";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";
import u from "@/utils";

export default Router().post("/", validateFields({
  id: z.uuid(),
}), async (req, res) => {
  res.set("Cache-Control", "no-store").json(success(await u.projects.openProject(u.authContext.getAuthUser(req), req.body.id)));
});
