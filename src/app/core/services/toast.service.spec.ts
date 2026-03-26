import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    jasmine.clock().install();
    service = new ToastService();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('should be created with empty toasts', () => {
    expect(service.toasts()).toEqual([]);
  });

  it('should add a toast with show()', () => {
    service.show('Test message', 'info');
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].message).toBe('Test message');
    expect(service.toasts()[0].type).toBe('info');
  });

  it('should add success toast', () => {
    service.success('Success!');
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].type).toBe('success');
  });

  it('should add error toast', () => {
    service.error('Error!');
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].type).toBe('error');
  });

  it('should dismiss a toast', () => {
    service.show('Test', 'info');
    const id = service.toasts()[0].id;
    service.dismiss(id);
    expect(service.toasts().length).toBe(0);
  });

  it('should handle multiple toasts', () => {
    service.success('First');
    service.error('Second');
    service.show('Third', 'info');
    expect(service.toasts().length).toBe(3);
  });

  it('should auto-dismiss after timeout', () => {
    service.show('Auto dismiss', 'info');
    expect(service.toasts().length).toBe(1);
    jasmine.clock().tick(4000);
    expect(service.toasts().length).toBe(0);
  });

  it('should assign unique IDs', () => {
    service.show('First', 'info');
    service.show('Second', 'info');
    const ids = service.toasts().map((t) => t.id);
    expect(new Set(ids).size).toBe(2);
  });
});
