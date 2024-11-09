import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop({ required: true })
  username: string;

  // email

  @Prop({ required: true })
  password: string;

  @Prop({ type: [String], default: ['user'] }) // to hold roles
  roles: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);
