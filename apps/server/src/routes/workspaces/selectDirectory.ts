import { Router } from "express";
import { success } from "@/lib/responseFormat";

export default Router().post("/", (_req, res) => {
  res.set("Cache-Control", "no-store").json(success({ native: false, directory: null }));
});
