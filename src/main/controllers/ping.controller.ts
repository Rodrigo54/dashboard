import { action, Controller, create, list, read, remove, save, update } from './controller.decorator.js';

@Controller('ping')
export class PingController {

  @create
  async create(...args: any[]): Promise<any> {
    throw new Error('Method not implemented.');
  }

  @save
  async createOrUpdate(...args: any[]): Promise<any> {
    throw new Error('Method not implemented.');
  }

  @read
  async findOne(...args: any[]): Promise<any> {
    return 'pong';
  }

  @update
  async update(...args: any[]): Promise<any> {
    throw new Error('Method not implemented.');
  }

  @remove
  async delete(...args: any[]): Promise<any> {
    throw new Error('Method not implemented.');
  }

  @list
  async findAll(...args: any[]): Promise<any> {
    return ['pong', 'ping', 'pang'];
  }

  @action('timestamp')
  async customAction(...args: any[]): Promise<any> {
    return new Date().toISOString();
  }

}
