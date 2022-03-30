import store from '@/store'

const Board = () => import('@/components/Board.vue')
const BoardHome = () => import('@/components/Board/Home.vue')
const List = () => import('@/components/List.vue')
const NavDefault = () => import('@/components/Nav/Default.vue')
const NavList = () => import('@/components/List/Nav.vue')

import BoardModel from '@/models/Board'
import ListModel from '@/models/List'

export default (router) => {
  [
    {
      path: '/board',
      name: 'currentBoard',
      beforeEnter: (to, from, next) => {
        if (store.getters['board/currentBoard']) {
          return {name: 'board', boardSlug: store.getters['board/currentBoard'].slug}
        }
        next()
      },
      components: {
        boardNavigation: NavDefault,
        boardContent: BoardHome
      }
    },
    {
      path: '/board/:boardSlug',
      components: {
        root: Board,
      },
      children: [
        {
          path: '',
          name: 'board',
          components: {
            boardNavigation: NavDefault,
            boardContent: BoardHome
          }
        },
        {
          path: 'list',
          name: 'newList',
          beforeEnter: (to, from, next) => {
            next({name: 'list', params: {listId: 'new'}})
          },
        },
        {
          path: 'list/:listId',
          name: 'list',
          components: {
            boardNavigation: NavList,
            boardContent: List
          }
        }
      ]
    },
  ].forEach((r) => router.addRoute(r))

  router.beforeResolve((to, from, next) => {
    //console.log('beforeResolve', from, to);
    if (to.params.boardSlug) {
      const board = BoardModel.query()
        .with('lists')
        .where('slug', to.params.boardSlug)
        .first()

      if (board) {
        store.commit('board/setCurrentBoard', board)
      } else {
        BoardModel.api()
          .get(`/boards/by-slug/${to.params.boardSlug}`)
          .then((response) => {
            store.commit('board/setCurrentBoard', response.entities.boards[0])
          })
          .catch((e) => {
            console.error(e)
            throw "Could not load board :("
          })
      }
    }
    if (to.params.listId) {
      if (to.params.listId === 'new') {
        store.commit('list/setCurrentList', new ListModel())
      } else {
        const list = ListModel.query()
          .with('items')
          .where('slug', to.params.listId)
          .first()

        if (list) {
          store.commit('list/setCurrentList', list)
        } else {
          ListModel.api()
            .get(`/lists/${to.params.listId}`)
            .then((response) => {
              store.commit('list/setCurrentList', response.entities.lists[0])
            })
            .catch((e) => {
              if (e.response && e.response.status === 404) {
                // List seems to be invalid, so remove it from local repository
                ListModel.delete(to.params.listId)
                throw "List not found!"
              } else {
                console.error(e)
                throw "Could not load list :("
              }
            })
        }
      }
    } else {
      // Clear current list if not used on current route
      store.commit('list/setCurrentList', {null: true})
    }
    next()
  })
}
