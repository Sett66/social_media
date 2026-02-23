const PENDING ="pending";
const FULFILLED ="fulfilled";
const REJECTED ="rejected";

class MyPromise{
  constructor(executor){
    this.status=PENDING;
    this.value=undefined;
    this.reason=undefined;

    this.onFulfuilledCallbacks=[];
    this.onRejectedCallbacls=[];

    const resolve=(value)=>{
      if(status===PENDING){
        this.status=FULFILLED;
        this.value=value;
        this.onFulfilledCallbacks.forEach(fn=>fn());
      }
    }

    const reject=(reason)=>{
      if(status===PENDING){
        this.status=REJECTED;
        this.reason=reason;
        this.onRejectedCallbacks.forEach(fn=>fn());
      }
    }

    try{
      executor(resolve,reject);
    } catch(e){
      reject(e);
    }
  }

  then(onFulfilled,onRejected){
    onFulfilled=typeof onFulfilled==="function"? onFulfilled : v=>v;
    onRejected=typeof onRejected==="function" ? onRejected : e=>{throw e};

    const promise2 = new MyPromise ((resolve,reject)=>{
      if(this.status===FULFILLED){
        queueMicrotask(()=>{
          try{
            const x =onFulfilled(this.value);
            resolvePromise(promise2,x,resolve,reject);
          } catch(e){
            reject(e);
          }
        });
      }

      if(this.status===REJECTED){
        queueMicrotask(()=>{
          try{
            const x =onRejected(this.reason);
            resolvePromise(promise2,x,resolve,reject);
          } catch(e){
            reject(e);
          }
        });
      }

      if(this.status===PENDING){
        this.onFulfilledCallbacks.push(()=>{
          queueMicrotask(()=>{
            try{
              const x =onFulfilled(this.value);
              resolvePromise(promise2,x,resolve,reject);
            } catch(e){
              reject(e);
            }
          });
        });

        this.onRejectedCallbacks.push(()=>{
          queueMicrotask(()=>{
            try{
              const x =onRejected(this.reason);
              resolvePromise(promise2,x,resolve,reject);
            } catch(e){
              reject(e);
            }
          });
        });
      }
    })
    return promise2;
  }

  catch(fn){
    return this.then(null,fn);
  }
  static resolve(value){
    return new MyPromise((resolve)=>resolve(value));
  }
  static reject(reason){
    return new MyPromise((_,reject)=>reject(reason));
  }
}

function resolvePromise(promise2,x,resolve,reject){
  if(promise2===x){
    return reject(new TypeError("chaining cycle detected"));
  }

  if(x instanceof MyPromise){
    x.then(resolve,reject);
  } else if(x!==null && (typeof x==="object" || typeof x ==="function")){
    let then;
    let called =false;
    try{
      then=x.then;
      if(typeof then==="function"){
        then.call(x, (y)=>{
          if(called) return;
          called = true;
          resolvePromise(promise2,y,resolve,reject);
        },
        (r)=>{
          if(called) return;
          called=true;
          resolvePromise(promise2,r,resolve,reject);
        }
        );
      } else {
        resolve(x);
      }
    } catch(e){
      if(!called){
        reject(e);
      }
    }
  } else {
    resolve(x);
  }
}