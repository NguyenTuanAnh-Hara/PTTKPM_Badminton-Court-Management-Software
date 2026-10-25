import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Button, Dropdown, Layout, Menu, Space, Tag, Typography } from 'antd';
import {
  CalendarOutlined, UnorderedListOutlined, GiftOutlined, UserOutlined, DashboardOutlined, FileSearchOutlined,
  ShopOutlined, ScheduleOutlined, AppstoreOutlined, DollarOutlined, CoffeeOutlined, TagsOutlined, TeamOutlined,
  BarChartOutlined, MessageOutlined, HistoryOutlined, LogoutOutlined, LoginOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext.jsx';
import { VAI_TRO } from '../utils/format.js';

const { Sider, Header, Content } = Layout;

// Menu theo vai trò – mỗi vai trò một “web” riêng như Hình 4.1
const MENU = {
  KHACH: [
    { key: '/', icon: <CalendarOutlined />, label: 'Đặt sân' },
    { key: '/don-cua-toi', icon: <UnorderedListOutlined />, label: 'Lịch đặt của tôi' },
    { key: '/uu-dai', icon: <GiftOutlined />, label: 'Thành viên & gói giờ' },
    { key: '/ca-nhan', icon: <UserOutlined />, label: 'Trang cá nhân' },
  ],
  KHACH_VANG_LAI: [
    { key: '/', icon: <CalendarOutlined />, label: 'Lịch sân trống' },
    { key: '/uu-dai', icon: <GiftOutlined />, label: 'Thành viên & gói giờ' },
  ],
  LE_TAN: [
    { key: '/le-tan/van-hanh', icon: <DashboardOutlined />, label: 'Vận hành sân' },
    { key: '/le-tan/lich-san', icon: <CalendarOutlined />, label: 'Lịch sân / đặt hộ' },
    { key: '/le-tan/don', icon: <FileSearchOutlined />, label: 'Quản lý đơn' },
    { key: '/le-tan/ban-goi', icon: <ShopOutlined />, label: 'Bán gói tại quầy' },
    { key: '/ca-nhan', icon: <UserOutlined />, label: 'Tài khoản' },
  ],
  HLV: [
    { key: '/hlv/lich-day', icon: <ScheduleOutlined />, label: 'Lịch dạy' },
    { key: '/ca-nhan', icon: <UserOutlined />, label: 'Tài khoản' },
  ],
  QUAN_LY: [
    { key: '/quan-ly/bao-cao', icon: <BarChartOutlined />, label: 'Báo cáo thống kê' },
    { key: '/quan-ly/san', icon: <AppstoreOutlined />, label: 'Quản lý sân' },
    { key: '/quan-ly/bang-gia', icon: <DollarOutlined />, label: 'Bảng giá' },
    { key: '/quan-ly/dich-vu', icon: <CoffeeOutlined />, label: 'Danh mục dịch vụ' },
    { key: '/quan-ly/uu-dai', icon: <TagsOutlined />, label: 'Ưu đãi' },
    { key: '/quan-ly/tai-khoan', icon: <TeamOutlined />, label: 'Tài khoản' },
    { key: '/quan-ly/don', icon: <FileSearchOutlined />, label: 'Đơn đặt sân' },
    { key: '/quan-ly/khieu-nai', icon: <MessageOutlined />, label: 'Khiếu nại' },
    { key: '/quan-ly/nhat-ky', icon: <HistoryOutlined />, label: 'Nhật ký thao tác' },
  ],
};

export default function MainLayout() {
  const { user, dangXuat } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [thuGon, setThuGon] = useState(false);
  const menu = !user ? MENU.KHACH_VANG_LAI : user.vaiTro === 'KHACH_HANG' ? MENU.KHACH : MENU[user.vaiTro];
  const chon = [...menu].sort((a, b) => b.key.length - a.key.length).find((m) => loc.pathname === m.key || (m.key !== '/' && loc.pathname.startsWith(m.key)));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsible collapsed={thuGon} onCollapse={setThuGon} theme="light" width={230} style={{ borderRight: '1px solid #eee' }}>
        <Link to={user?.trangMacDinh || '/'}>
          <div style={{ padding: '18px 16px', fontWeight: 700, fontSize: thuGon ? 14 : 17, color: '#0f7b5f', whiteSpace: 'nowrap' }}>
            🏸 {thuGon ? 'SCL' : 'Sân cầu lông'}
          </div>
        </Link>
        <Menu mode="inline" selectedKeys={chon ? [chon.key] : []} items={menu} onClick={(e) => nav(e.key)} style={{ borderInlineEnd: 0 }} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderBottom: '1px solid #eee' }}>
          {user ? (
            <Dropdown
              menu={{
                items: [
                  { key: 'ca-nhan', icon: <UserOutlined />, label: 'Tài khoản của tôi', onClick: () => nav('/ca-nhan') },
                  { key: 'dang-xuat', icon: <LogoutOutlined />, label: 'Đăng xuất', onClick: async () => { await dangXuat(); nav('/'); } },
                ],
              }}
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar style={{ background: '#0f7b5f' }}>{user.hoTen.split(' ').pop()[0]}</Avatar>
                <Typography.Text strong>{user.hoTen}</Typography.Text>
                <Tag>{VAI_TRO[user.vaiTro]}</Tag>
              </Space>
            </Dropdown>
          ) : (
            <Space>
              <Button icon={<LoginOutlined />} onClick={() => nav('/dang-nhap')}>Đăng nhập</Button>
              <Button type="primary" onClick={() => nav('/dang-ky')}>Đăng ký</Button>
            </Space>
          )}
        </Header>
        <Content style={{ margin: 20 }}>
          <div className="trang">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
