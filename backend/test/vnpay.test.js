// Kiểm thử cấu hình và chữ ký VNPAY. Chạy: npm run test:rules
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VnpayGateway } from '../src/agents/vnpayGateway.js';

test('VNPAY_MODE chỉ nhận mock | sandbox', () => {
  assert.throws(() => new VnpayGateway({ mode: 'production' }), /không hợp lệ/);
  assert.equal(new VnpayGateway({ mode: 'sandbox' }).laGiaLap, false);
  assert.equal(new VnpayGateway({ mode: 'mock', nodeEnv: 'development' }).laGiaLap, true);
});

test('Không cho chạy giả lập trên production', () => {
  assert.throws(() => new VnpayGateway({ mode: 'mock', nodeEnv: 'production' }), /production/);
  assert.doesNotThrow(() => new VnpayGateway({ mode: 'sandbox', nodeEnv: 'production' }));
});

test('Chữ ký kết quả: đúng thì qua, sửa số tiền thì bị từ chối', () => {
  const g = new VnpayGateway({ mode: 'mock', nodeEnv: 'test', hashSecret: 'bi-mat' });
  const kq = g.taoKetQuaGiaLap({ txnRef: 'TT1', soTien: 250000, thanhCong: true });
  assert.equal(g.xacMinhChuKy(kq), true);
  assert.equal(g.xacMinhChuKy({ ...kq, vnp_Amount: 100 }), false);
  assert.equal(new VnpayGateway({ mode: 'mock', nodeEnv: 'test', hashSecret: 'khac' }).xacMinhChuKy(kq), false);
});
