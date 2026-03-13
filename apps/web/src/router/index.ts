import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: () => import("@/views/HomeView.vue") },
    { path: "/chart/:platform/:id", name: "chart", component: () => import("@/views/ChartView.vue") },
    { path: "/playlist/:platform/:id", name: "playlist", component: () => import("@/views/PlaylistView.vue") },
    { path: "/search/:platform", name: "search", component: () => import("@/views/SearchView.vue") },
    { path: "/search", redirect: () => {
      // 从本地存储读取上次使用的平台，默认网易云
      const saved = localStorage.getItem("music-lemon_platform") || "netease";
      return `/search/${saved}`;
    }},
    { path: "/player/:platform/:sourceId", name: "player", component: () => import("@/views/PlayerView.vue") },
    { path: "/recent", name: "recent", component: () => import("@/views/RecentView.vue") },
  ],
});

export default router;
