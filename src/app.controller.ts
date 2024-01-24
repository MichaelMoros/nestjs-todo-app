import { Controller, Get, Render, Res } from '@nestjs/common';
import { Response } from 'express';
import { Auth } from './iam/authentication/decorators/auth.decorator';
import { AuthType } from './iam/authentication/enums/auth-type.enum';

@Auth(AuthType.None)
@Controller()
export class AppController { }
