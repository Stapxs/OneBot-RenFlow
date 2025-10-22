import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'list',
        component: () => import('@app/views/ListView.vue'),
        meta: {
            title: 'Ren Flow'
        }
    },
    {
        path: '/edit',
        name: 'edit',
        component: () => import('@app/views/EditView.vue'),
        meta: {
            title: 'Edit - Ren Flow'
        }
    },
    {
        path: '/settings',
        name: 'settings',
        component: () => import('@app/views/SettingsView.vue'),
        meta: {
            title: 'Settings - Ren Flow'
        }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 更新窗口标题
router.beforeEach((to, _from, next) => {
    if (to.meta.title) {
        document.title = to.meta.title as string
    }
    next()
})

export default router
