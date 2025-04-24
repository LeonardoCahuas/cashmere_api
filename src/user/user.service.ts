import { Injectable, NotFoundException, ConflictException } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import type { CreateUserDto, UpdateUserDto } from "./dto/user.dto"
import * as bcrypt from "bcrypt"
import { RoleType } from '../../utils/types'
import { Role } from "@prisma/client"

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }

  async create(data: CreateUserDto) {
    console.log("DATAAAA")
    console.log(data)
    const existingUser = await this.prisma.user.findUnique({
      where: { username: data.username },
    })
    
    if (existingUser) {
      throw new ConflictException("Username already exists")
    }
    
    const hashedPassword = await bcrypt.hash(data.password, 10)
    
    // Prepara l'oggetto dati mantenendo lo spread originale
    const userData = {
      ...data,
      auth_id: data.username,
      password: hashedPassword,
    }
    console.log("DATAAAA1")
    console.log(data)
    // Se è fornito managerId, aggiungi la connessione al manager
    if (data.managerId) {
      // Verifica se il manager esiste
      const managerExists = await this.prisma.user.findUnique({
        where: { id: data.managerId },
      })
      
      if (!managerExists) {
        throw new NotFoundException(`Manager with ID ${data.managerId} not found`)
      }
      
      // Sostituisci il managerId con la connessione appropriata
      delete userData.managerId;
      //@ts-ignore
      userData.manager = {
        connect: { id: data.managerId }
      }
    }
    
    return this.prisma.user.create({
      data: userData,
    })
  }

  async findAll() {
    return this.prisma.user.findMany({
      include: {
        entity: true,
      },
    })
  }

  async findManagers(id: string) {
    return this.prisma.user.findMany({
      where:{managerId: id},
      include: {
        entity: true,
      },
    })
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        entity: true,
      },
    })

    if (!user) {
      throw new NotFoundException("User not found")
    }

    return user
  }

  async update(id: string, data: UpdateUserDto) {
    const user = await this.findOne(id)

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10)
    }

    return this.prisma.user.update({
      where: { id },
      data,
      include: {
        entity: true,
      },
    })
  }

  async updateRole(id: string, role: RoleType) {
    const user = await this.findOne(id);
  
    if (!user) {
      throw new Error("User not found");
    }
  
    return this.prisma.user.update({
      where: { id },
      data: { role: role },
      include: { entity: true },
    });
  }

  async updateEntity(id: string, entity: string) {
    const user = await this.findOne(id);
  
    if (!user) {
      throw new Error("User not found");
    }
  
    return this.prisma.user.update({
      where: { id },
      data: { entity: { connect: { id: entity } }, },
      include: { entity: true },
    });
  }

  async updateUsername(id: string, newUsername: string) {
    const user = await this.findOne(id);
  
    if (!user) {
      throw new Error("User not found");
    }
  
    return this.prisma.user.update({
      where: { id },
      data: { username: newUsername }
    });
  }

  async updateNotes(id: string, notes: string) {
    const user = await this.findOne(id);
  
    if (!user) {
      throw new Error("User not found");
    }
  
    return this.prisma.user.update({
      where: { id },
      //@ts-ignore
      data: { notes: notes }
    });
  }

  async remove(id: string) {
    const user = await this.findOne(id)

    return this.prisma.user.delete({
      where: { id },
    })
  }

  async findByRole(role: RoleType) {
    return this.prisma.user.findMany({
      where: {
        role: role,
      },
      include: {
        entity: true,
      },
    })
  }

  async findAllUsers() {
    return this.prisma.user.findMany({
      where: {
        role: {
          in: [Role.ENGINEER, Role.SECRETARY, Role.USER, Role.MANAGER], // Seleziona utenti con questi ruoli
        },
      },
      include: {
        entity: true,
      },
    });
  }
  
}