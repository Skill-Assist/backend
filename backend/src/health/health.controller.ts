/** nestjs */
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
} from "@nestjs/terminus";
import { Controller, Get } from "@nestjs/common";

/** utils */
import { AllowAnon } from "../auth/guards/allow-anon.guard";
//////////////////////////////////////////////////////////////////////////////////////

@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator
  ) {}

  @AllowAnon()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.http.pingCheck("google", "https://google.com"),
    ]);
  }
}
