// BAEK TO YOU — Firestore 보안 규칙 자동 테스트 (Firebase 에뮬레이터)
// 실행 (컴퓨터, Node 18+ · Java 11+):
//   npm i -D firebase-tools @firebase/rules-unit-testing firebase
//   npx firebase emulators:exec --only firestore --project demo-b2u "node tests/rules.test.js"
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, deleteDoc, collection, getDocs } = require('firebase/firestore');

(async () => {
  const env = await initializeTestEnvironment({ projectId: 'demo-b2u', firestore: { rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 } });
  await env.withSecurityRulesDisabled(async c => {
    const d = c.firestore();
    await setDoc(doc(d, 'admins', 'ADMIN'), { role: 'admin' });
    await setDoc(doc(d, 'content', 'main'), { rev: 1, chunks: 1 });
    await setDoc(doc(d, 'users', 'ADMIN'), { rev: 1, chunks: 0 });
    await setDoc(doc(d, 'users', 'U1'), { rev: 1, chunks: 0 });
  });
  const anon = env.unauthenticatedContext().firestore();
  const admin = env.authenticatedContext('ADMIN').firestore();
  const u1 = env.authenticatedContext('U1').firestore();
  const u2 = env.authenticatedContext('U2').firestore();
  const cases = [
    ['누구나 콘텐츠 읽기', () => assertSucceeds(getDoc(doc(anon, 'content', 'main')))],
    ['익명 콘텐츠 쓰기 거부', () => assertFails(setDoc(doc(anon, 'content', 'main'), { rev: 2 }))],
    ['일반 사용자 콘텐츠 쓰기 거부', () => assertFails(setDoc(doc(u1, 'content', 'main'), { rev: 2 }))],
    ['일반 사용자 콘텐츠 조각 쓰기 거부', () => assertFails(setDoc(doc(u1, 'content', 'main', 'chunks', '0'), { rev: 2, data: '{}' }))],
    ['일반 사용자 콘텐츠 삭제 거부', () => assertFails(deleteDoc(doc(u1, 'content', 'main')))],
    ['관리자 콘텐츠 쓰기 허용', () => assertSucceeds(setDoc(doc(admin, 'content', 'main'), { rev: 2, chunks: 1 }))],
    ['관리자 콘텐츠 조각 쓰기 허용', () => assertSucceeds(setDoc(doc(admin, 'content', 'main', 'chunks', '0'), { rev: 2, data: '{}' }))],
    ['일반 사용자 사진 등록 거부', () => assertFails(setDoc(doc(u1, 'photos', 'p1'), { data: 'data:image/jpeg;base64,AA' }))],
    ['관리자 사진 등록 허용', () => assertSucceeds(setDoc(doc(admin, 'photos', 'p1'), { data: 'data:image/jpeg;base64,AA' }))],
    ['관리자 사진 1MB 초과 거부', () => assertFails(setDoc(doc(admin, 'photos', 'p2'), { data: 'x'.repeat(1000001) }))],
    ['누구나 사진 읽기', () => assertSucceeds(getDoc(doc(anon, 'photos', 'p1')))],
    ['일반 사용자 사진 삭제 거부', () => assertFails(deleteDoc(doc(u1, 'photos', 'p1')))],
    ['스스로 관리자 지정 거부', () => assertFails(setDoc(doc(u1, 'admins', 'U1'), { role: 'admin' }))],
    ['관리자도 관리자 문서 쓰기 거부', () => assertFails(setDoc(doc(admin, 'admins', 'U1'), { role: 'admin' }))],
    ['다른 사람 관리자 문서 읽기 거부', () => assertFails(getDoc(doc(u1, 'admins', 'ADMIN')))],
    ['관리자 목록 조회 거부', () => assertFails(getDocs(collection(u1, 'admins')))],
    ['내 관리자 문서 확인 허용', () => assertSucceeds(getDoc(doc(admin, 'admins', 'ADMIN')))],
    ['본인 학습 데이터 읽기·쓰기 허용', () => assertSucceeds(setDoc(doc(u1, 'users', 'U1', 'chunks', '0'), { rev: 2, data: '{}' }))],
    ['본인 조각 목록 허용', () => assertSucceeds(getDocs(collection(u1, 'users', 'U1', 'chunks')))],
    ['다른 사용자 데이터 읽기 거부', () => assertFails(getDoc(doc(u2, 'users', 'U1')))],
    ['다른 사용자 데이터 쓰기 거부', () => assertFails(setDoc(doc(u2, 'users', 'U1'), { rev: 9 }))],
    ['관리자도 사용자 데이터 읽기 거부', () => assertFails(getDoc(doc(admin, 'users', 'U1')))],
    ['관리자도 사용자 데이터 덮어쓰기 거부', () => assertFails(setDoc(doc(admin, 'users', 'U1', 'chunks', '0'), { rev: 9, data: '{}' }))],
    ['익명 사용자 데이터 읽기 거부', () => assertFails(getDoc(doc(anon, 'users', 'U1')))],
    ['그 밖의 경로 거부', () => assertFails(setDoc(doc(u1, 'other', 'x'), { a: 1 }))]
  ];
  let fail = 0;
  for (const [name, f] of cases) { try { await f(); console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, e.message); } }
  await env.cleanup();
  console.log(fail ? `\n${fail}개 실패` : '\n모두 통과'); process.exit(fail ? 1 : 0);
})();
