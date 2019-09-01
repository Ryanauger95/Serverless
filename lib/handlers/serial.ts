import { Mutex } from "async-mutex";
const mutex = new Mutex();

function createNewList(): number[] {
  const list: number[] = [];
  console.log("CREATING NEW LIST \n\n");
  return list;
}

async function addUserList(id: number, list: number[]): Promise<boolean> {
  const release = await mutex.acquire();
  console.log(`ADDING NEW USER(${id}) \n\n`);
  if (list.includes(id)) {
    release();
    console.log(`FAILED TO ADD USER(${id}) \n\n`);
    return false;
  } else {
    list.push(id);
    release();
    console.log(`ADDED USER(${id}) \n\n`);
    return true;
  }
}

async function removeUserList(id: number, list: number[]) {
  const release = await mutex.acquire();
  console.log(`REMOVING USER(${id}) \n\n`);
  list = list.filter(function(value, index, arr) {
    return value != id;
  });
  release();
  return list;
}
async function printUserList(list: number[]) {
  const release = await mutex.acquire();
  release();
  return console.log("Processing users: ", list);
}

export { createNewList, addUserList, removeUserList, printUserList };
