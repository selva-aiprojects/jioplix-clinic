import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common'
import { SupportTicketService } from './support-ticket.service.js'
import { TenantGuard } from '../tenancy/tenant.guard.js'
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js'

@Controller('support')
export class SupportTicketController {
  constructor(private readonly sts: SupportTicketService) {}

  // ─── Tenant endpoints ──────────────────────────────────────────────
  @Post('tickets')
  @UseGuards(TenantGuard)
  async createTicket(
    @Req() req: any,
    @Body() body: { subject: string; category: string; priority: string; message: string },
  ) {
    return this.sts.createTicket(
      req.tenantId, req.userId, body.subject, body.category, body.priority, body.message,
    )
  }

  @Get('tickets')
  @UseGuards(TenantGuard)
  async listMyTickets(@Req() req: any) {
    return this.sts.listTenantTickets(req.tenantId)
  }

  @Get('tickets/:ticketId')
  @UseGuards(TenantGuard)
  async getTicket(@Param('ticketId') ticketId: string) {
    return this.sts.getTicket(ticketId)
  }

  @Post('tickets/:ticketId/reply')
  @UseGuards(TenantGuard)
  async replyToTicket(
    @Param('ticketId') ticketId: string,
    @Body() body: { message: string },
    @Req() req: any,
  ) {
    return this.sts.addResponse(ticketId, 'tenant', req.user?.fullName ?? 'User', body.message)
  }

  // ─── Platform admin endpoints ──────────────────────────────────────
  @Get('platform/tickets')
  @UseGuards(JwtAuthGuard)
  async platformListTickets(@Query('status') status?: string) {
    return this.sts.listAllTickets(status)
  }

  @Get('platform/tickets/:ticketId')
  @UseGuards(JwtAuthGuard)
  async platformGetTicket(@Param('ticketId') ticketId: string) {
    return this.sts.getTicket(ticketId)
  }

  @Post('platform/tickets/:ticketId/reply')
  @UseGuards(JwtAuthGuard)
  async platformReply(
    @Param('ticketId') ticketId: string,
    @Body() body: { message: string; responderName: string },
  ) {
    return this.sts.addResponse(ticketId, 'platform', body.responderName ?? 'Support', body.message)
  }

  @Patch('platform/tickets/:ticketId/status')
  @UseGuards(JwtAuthGuard)
  async platformUpdateStatus(
    @Param('ticketId') ticketId: string,
    @Body() body: { status: string },
  ) {
    return this.sts.updateStatus(ticketId, body.status)
  }

  @Get('platform/stats')
  @UseGuards(JwtAuthGuard)
  async platformStats() {
    return this.sts.getStats()
  }
}
