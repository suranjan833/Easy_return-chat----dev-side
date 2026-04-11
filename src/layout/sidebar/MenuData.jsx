const menu = [

  {
    icon: 'bi bi-speedometer2',
    text: 'Dashboard',
    link: '/analytics',
    allowedRoles: [2, 1, 3], // Admin, Manager, Agent
  },


  {
    icon: 'bi bi-chat',
    text: 'Chat Management',
    allowedRoles: [2, 1, 3], // all
    subMenu: [
      {
        icon: 'bi bi-chat-bubble',
        text: 'Messages',
        link: '/messages',
        allowedRoles: [2, 1, 3],
      },
      {
        icon: 'bi bi-headset',
        text: 'Support Chat',
        link: '/support-chat',
        allowedRoles: [2, 1, 3],
      },
    ],
  },

  
  {
    icon: 'bi bi-briefcase',
    text: 'Department Setup',
    allowedRoles: [2],
    subMenu: [
      {
        icon: 'bi bi-plus-circle',
        text: 'Create Department',
        link: '/create-department',
        allowedRoles: [2],
      },
      {
        icon: 'bi bi-building',
        text: 'Department List',
        link: '/list-departments',
        allowedRoles: [2],
      },
    ],
  },


  {
    icon: 'bi bi-person',
    text: 'User Administration',
    allowedRoles: [2, 1],
    subMenu: [
      {
        icon: 'bi bi-person-plus',
        text: 'Create User',
        link: '/create-user',
        allowedRoles: [2, 1],
      },
      {
        icon: 'bi bi-person-lines-fill',
        text: 'All Users',
        link: '/list-users',
        allowedRoles: [2, 1],
      },
      {
        icon: 'bi bi-search',
        text: 'Search Users',
        link: '/search-users',
        allowedRoles: [2, 1],
      },
    ],
  },


  {
    icon: 'bi bi-globe',
    text: 'Sites',
    allowedRoles: [2, 1],
    subMenu: [
      {
        icon: 'bi bi-plus-circle',
        text: 'Create Site',
        link: '/sites/create',
        allowedRoles: [2], // manager no delete/create
      },
      {
        icon: 'bi bi-list',
        text: 'Site List',
        link: '/sites/list',
        allowedRoles: [2, 1],
      },
    ],
  },


  {
    icon: 'bi bi-people',
    text: 'Groups',
    allowedRoles: [2, 1, 3],
    subMenu: [
      {
        icon: 'bi bi-plus',
        text: 'Create Group',
        link: '/groups/create',
        allowedRoles: [2, 1],
      },
      {
        icon: 'bi bi-list',
        text: 'List Groups',
        link: '/groups',
        allowedRoles: [2, 1, 3],
      },
    ],
  },


  {
    icon: 'bi bi-life-preserver',
    text: 'Support Requests',
    allowedRoles: [2, 1, 3],
    link: '/support-requests',
  },


  {
    icon: 'bi bi-graph-up',
    text: 'Analytics',
    allowedRoles: [2, 1, 3],
    subMenu: [
      {
        icon: 'bi bi-bar-chart',
        text: 'Chat Analytics',
        link: '/chat-analytics',
        allowedRoles: [2, 1, 3],
      },
      {
        icon: 'bi bi-person-workspace',
        text: 'Agent Metrics',
        link: '/agent-performance',
        allowedRoles: [2, 1], 
      },
      {
        icon: 'bi bi-clock',
        text: 'Reports',
        link: '/analytics',
        allowedRoles: [2, 1, 3],
      },
    ],
  },


  // Sheet: Admin only
  {
    icon: 'bi bi-gear',
    text: 'System Configuration',
    allowedRoles: [2],
    subMenu: [
      {
        icon: 'bi bi-lightning',
        text: 'Shortcuts',
        link: '/shortcuts',
        allowedRoles: [2],
      },
    ],
  },

  
  {
    icon: 'bi bi-info-circle',
    text: 'Support Resources',
    allowedRoles: [2, 1, 3],
    subMenu: [
      {
        icon: 'bi bi-file-text',
        text: 'Documentation',
        link: '/docs',
        allowedRoles: [2, 1, 3],
      },
      {
        icon: 'bi bi-headset',
        text: 'Help Desk',
        link: '/contact-support',
        allowedRoles: [2, 1, 3],
      },
    ],
  },
];

export default menu;