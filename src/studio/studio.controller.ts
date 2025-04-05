import {
    Controller,
    Get,
    Post,
    Body,
    Put,
    Param,
    Delete,
    UseGuards,
    Query,
  } from '@nestjs/common';
  import { StudioService } from './studio.service';
  import { CreateStudioDto, UpdateStudioDto } from './dto/studio.dto';
  import { JwtAuthGuard } from '../auth/jwt-auth.guards';
  import { RolesGuard } from '../auth/roles.guards';
  import { Roles } from '../auth/roles.decorator';
  import { Role } from '@prisma/client';
  
  @Controller('studios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  export class StudioController {
    constructor(private readonly studioService: StudioService) {}
  
    @Post()
    @Roles(Role.ADMIN)
    create(@Body() createStudioDto: CreateStudioDto) {
      return this.studioService.create(createStudioDto);
    }
  
    @Get()
    @Roles(Role.ADMIN, Role.SECRETARY, Role.USER, Role.ENGINEER)
    findAll() {
      console.log('Accessing findAll endpoint');
      return this.studioService.findAll();
    }
  
    @Get(':id')
    @Roles(Role.ADMIN, Role.SECRETARY, Role.USER, Role.ENGINEER)
    findOne(@Param('id') id: string) {
      return this.studioService.findOne(id);
    }
  
    @Put(':id')
    @Roles(Role.ADMIN)
    update(@Param('id') id: string, @Body() updateStudioDto: UpdateStudioDto) {
      return this.studioService.update(id, updateStudioDto);
    }
  
    @Delete(':id')
    @Roles(Role.ADMIN)
    remove(@Param('id') id: string) {
      return this.studioService.remove(id);
    }
  
    @Get(':id/availability')
    @Roles(Role.ADMIN, Role.SECRETARY, Role.USER, Role.ENGINEER)
    checkAvailability(
      @Param('id') id: string,
      @Query('start') start: string,
      @Query('end') end: string,
      @Query('fonicoId') fonicoId: string,
    ) {
      return this.studioService.checkAvailability(
        id,
        new Date(start),
        new Date(end),
        fonicoId,
      );
    }
  }
  