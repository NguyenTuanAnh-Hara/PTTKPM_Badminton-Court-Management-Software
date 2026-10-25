import axios from 'axios';

// apiClient: mọi yêu cầu tới backend đi qua /api/v1 (Vite chuyển tiếp sang cổng 3000), gửi kèm cookie phiên
const client = axios.create({ baseURL: '/api/v1', withCredentials: true, timeout: 20000 });

client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const d = err.response?.data;
    const e = new Error(d?.message || (err.response ? 'Có lỗi xảy ra' : 'Không kết nối được máy chủ. Hãy kiểm tra backend đã chạy chưa.'));
    e.code = d?.code || (err.response ? `HTTP_${err.response.status}` : 'MAT_KET_NOI');
    e.status = err.response?.status;
    e.details = d?.details;
    return Promise.reject(e);
  },
);

export default client;
