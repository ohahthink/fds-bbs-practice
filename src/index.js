import '@babel/polyfill'

import axios from 'axios'

const api = axios.create({
  // 바깥에서 주입해준 환경변수를 사용하는 코드
  // 이 컴퓨터에서만 사용할 환경변수를 설정하기 위해서 .env 파일을 편집하면 된다.
  baseURL: process.env.API_URL
})

api.interceptors.request.use(function (config) {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers['Authorization'] = 'Bearer ' + token
  }
  return config
});

const templates = {
  loginForm: document.querySelector('#login-form').content,
  postList: document.querySelector('#post-list').content,
  postItem: document.querySelector('#post-item').content,
  postForm: document.querySelector('#post-form').content,
  postDetail: document.querySelector('#post-detail').content,
  commentItem: document.querySelector('#comment-item').content,
}

const rootEl = document.querySelector('.root')

// 페이지 그리는 함수 작성 순서
// 1. 템플릿 복사
// 2. 요소 선택
// 3. 필요한 데이터 불러오기
// 4. 내용 채우기
// 5. 이벤트 리스너 등록하기
// 6. 템플릿을 문서에 삽입

async function drawLoginForm() {
  // 1. 템플릿 복사
  const frag = document.importNode(templates.loginForm, true)

  // 2. 요소 선택
  const formEl = frag.querySelector('.login-form')

  // 3. 필요한 데이터 불러오기 - 필요없음
  // 4. 내용 채우기 - 필요없음
  // 5. 이벤트 리스너 등록하기
  formEl.addEventListener('submit', async e => {
    e.preventDefault()
    const username = e.target.elements.username.value
    const password = e.target.elements.password.value

    const res = await api.post('/users/login', {
      username,
      password
    })

    localStorage.setItem('token', res.data.token)
    drawPostList()
  })

  // 6. 템플릿을 문서에 삽입
  rootEl.textContent = ''
  rootEl.appendChild(frag)
}

async function drawPostList() {
  // 1. 템플릿 복사
  const frag = document.importNode(templates.postList, true)

  // 2. 요소 선택
  const listEl = frag.querySelector('.post-list')
  const createEl = frag.querySelector('.create')


  // 3. 필요한 데이터 불러오기
  // {data} data라는 속성에 들어있는 값을 꺼내서 postList라는 변수에 저장하는 것 밑 주서과 같은 의미
  const {data: postList} = await api.get('/posts?_expand=user')
  // const res = await api.get('/posts?_embed=user')
  // const postList = res.data

  // 4. 내용 채우기
  for (const postItem of postList) {
    const frag = document.importNode(templates.postItem, true)

    const idEl = frag.querySelector('.id')
    const titleEl = frag.querySelector('.title')
    const authorEl = frag.querySelector('.author')

    idEl.textContent = postItem.id
    titleEl.textContent = postItem.title
    authorEl.textContent = postItem.user.username

    titleEl.addEventListener('click', e => {
      // 내가 클릭한 요소의 id가 넘어감
      drawPostDetail(postItem.id)
    })

    listEl.appendChild(frag)
  }

  // 5. 이벤트 리스너 등록하기

  createEl.addEventListener('click', e => {
    drawNewPostForm()
  })

  // 6. 템플릿을 문서에 삽입
  rootEl.textContent = ''
  rootEl.appendChild(frag)
}

// 게시물을 표시해주는 함수, 내가 보여줘야할 게시물이 그때그때 다를 수 있으므로 매개변수를 받습니다
async function drawPostDetail(postId) {
  // 1. 템플릿 복사
  const frag = document.importNode(templates.postDetail, true)

  // 2. 요소 선택
  const titleEl = frag.querySelector('.title')
  const authorEl = frag.querySelector('.author')
  const bodyEl = frag.querySelector('.body')
  const backEl = frag.querySelector('.back')
  const commentListEl = frag.querySelector('.comment-list')
  const commentFormEl = frag.querySelector('.comment-form')
  const updateEl = frag.querySelector('.update')

  // 3. 필요한 데이터 불러오기
  // 2중분해대입 , 분해대입은 3중 4중 5중도 가능합니다 배열이 분해되서 변수에 들어갑니다 title이라는 body라는 user라는 comments변수
  const {data: {title, body, user, comments}} = await api.get('/posts/' + postId, {
    params: {
      _expand: 'user',
      _embed: 'comments'
      //_page: 1,
      //_limit: 15
    }
  })

  const params = new URLSearchParams()
  comments.forEach(c => {
    params.append('id', c.userId)
  })
  // userList에는 댓글 작성자 정보를 포함하는 배열이 저장되는 것
  const {data: userList} = await api.get('/users', {
    params
  })

  // 4. 내용 채우기
  // 분해대입 했기때문에
  titleEl.textContent = title
  bodyEl.textContent = body
  authorEl.textContent = user.username
  // 댓글 표시
  for (const commentItem of comments) {
    // 페이지 그리는 함수 작성 순서
    // 1. 템플릿 복사
    const frag = document.importNode(templates.commentItem, true)

    // 2. 요소 선택
    const authorEl = frag.querySelector('.author')
    const bodyEl = frag.querySelector('.body')
    const deleteEl = frag.querySelector('.delete')

    // 3. 필요한 데이터 불러오기 - 필요없음
    // 4. 내용 채우기
    bodyEl.textContent = commentItem.body
    // 댓글 작성자가 user에 저장됨
    const user = userList.find(item => item.id === commentItem.userId)
    authorEl.textContent = user.username

    // 5. 이벤트 리스너 등록하기
    // 6. 템플릿을 문서에 삽입
    commentListEl.appendChild(frag)

  }

  // 5. 이벤트 리스너 등록하기
  backEl.addEventListener('click', e => {
    drawPostList()
  })

  updateEl.addEventListener('click', e => {
    drawEditPostForm(postId)
  })

  commentFormEl.addEventListener('submit', async e => {
    //전송이 일어나면
    e.preventDefault()
    const name = e.target.elements.body.value
    // 어떤 자원의 자식이 되는 자원을 등록할때는
    await api.post(`/posts/${postId}/comments`, {
      body
    })
    drawPostDetail(postId)
  })

  // 6. 템플릿을 문서에 삽입
  rootEl.textContent = ''
  rootEl.appendChild(frag)

}

async function drawNewPostForm() {
  // 새글 추가하는 함수
  // 1. 템플릿 복사
  const frag = document.importNode(templates.postForm, true)

  // 2. 요소 선택
  const formEl = frag.querySelector('.post-form')
  const backEl = frag.querySelector('.back')

  // 3. 필요한 데이터 불러오기
  // 4. 내용 채우기
  // 5. 이벤트 리스너 등록하기
  formEl.addEventListener('submit', async e => {
    // 브라우저 기본내장기능 해제,취소
    e.preventDefault()
    const title = e.target.elements.title.value
    const body = e.target.elements.body.value
    await api.post('/posts', {
      title,
      body
    })
    drawPostList()
  })
  backEl.addEventListener('click', e => {
    // 브라우저 기본내장기능 해제,취소 폼안에 버튼이 들어있으면 각별히 주의 !
    e.preventDefault()
    drawPostList()
  })

  // 6. 템플릿을 문서에 삽입
  rootEl.textContent = ''
  rootEl.appendChild(frag)
}

async function drawEditPostForm(postId) {
  // 새글 추가하는 함수
  // 1. 템플릿 복사
  const frag = document.importNode(templates.postForm, true)

  // 2. 요소 선택
  const formEl = frag.querySelector('.post-form')
  const backEl = frag.querySelector('.back')
  const titleEl = frag.querySelector('.title')
  const bodyEl = frag.querySelector('.body')

  // 3. 필요한 데이터 불러오기
  const {data: {title, body}} = await api.get('/posts/' + postId)

  // 4. 내용 채우기
  titleEl.value = title
  bodyEl.value = body

  // 5. 이벤트 리스너 등록하기
  formEl.addEventListener('submit', async e => {
    // 브라우저 기본내장기능 해제,취소
    e.preventDefault()
    const title = e.target.elements.title.value
    const body = e.target.elements.body.value
    await api.patch('/posts/' + postId, {
      title,
      body
    })
    drawPostList()
  })
  backEl.addEventListener('click', e => {
    // 브라우저 기본내장기능 해제,취소 폼안에 버튼이 들어있으면 각별히 주의 !
    e.preventDefault()
    drawPostList()
  })

  // 6. 템플릿을 문서에 삽입
  rootEl.textContent = ''
  rootEl.appendChild(frag)

}

// 페이지 로드 시 그릴 화면 설정
if (localStorage.getItem('token')) {
  drawPostList()
} else {
  drawLoginForm()
}
