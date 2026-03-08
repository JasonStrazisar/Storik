import { HttpRouter, HttpServer, HttpServerResponse } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { createServer } from "node:http"

const router = HttpRouter.empty.pipe(
  HttpRouter.get("/", Effect.succeed(HttpServerResponse.text("ok")))
)

const app = router.pipe(HttpServer.serve())

const ServerLive = NodeHttpServer.layer(createServer, { port: 3001 })

NodeRuntime.runMain(Layer.launch(app).pipe(Effect.provide(ServerLive)))
