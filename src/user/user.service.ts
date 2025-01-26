import { Injectable, NotFoundException, ConflictException } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import type { CreateUserDto, UpdateUserDto } from "./dto/user.dto"
import * as bcrypt from "bcrypt"

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { username: data.username },
    })

    if (existingUser) {
      throw new ConflictException("Username already exists")
    }

    const hashedPassword = await bcrypt.hash(data.password, 10)

    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    })
  }

  async findAll() {
    return this.prisma.user.findMany({
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

  async remove(id: string) {
    const user = await this.findOne(id)

    return this.prisma.user.delete({
      where: { id },
    })
  }
}