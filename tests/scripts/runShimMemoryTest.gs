output pushnew runShimMemoryTest.out
! file tests/scripts/runShimMemoryTest.gs
!
! How much temporary object memory a call across the C-extension shim leaves
! behind (docs/Shim_Memory.md, Step 0).  Runs a workload's step(n) in
! batches; after each batch a full mark-sweep, then the space in use.  The
! growth from the first measured batch to the last, divided by the calls in
! between, is what each call retains -- what a long-running numpy program
! accumulates until it runs out of memory.
!
! It REPORTS and does not fail: the proxies, origins and wrappers a call
! leaves hold Grail memory until Steps 2 and 3 of docs/Shim_Memory.md, so the
! number is still large.  Step 1 frees C objects, which the C heap line
! shows.  A later step gives it a threshold.  It fails only when the
! workload cannot run.
!
! The workload defaults to tests/scripts/shim_memory_workload.py, which needs
! lib/_grail_demo.so (built by install.sh) and is skipped without it.
! GRAIL_SHIM_MEMORY_WORKLOAD names another file defining step(n) -- one
! calling numpy, for instance -- and GRAIL_SHIM_MEMORY_BATCH its batch size.
!
! It cannot be an SUnit test: a test shares its session, and so its memory,
! with every test before it in the shard.
iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

login
run
| dir |
dir := importlib grailDir.
dir ifNotNil: [
  (System gemEnvironmentVariable: 'GRAIL_DIR') = dir ifFalse: [
    System gemEnvironmentVariable: 'GRAIL_DIR' put: dir]]
%
level 0
run
| out path batch demo mod used first last batches perCall heap stats |
out := GsFile stdout.
path := System gemEnvironmentVariable: 'GRAIL_SHIM_MEMORY_WORKLOAD'.
(path isNil or: [path isEmpty]) ifTrue: [
  path := importlib grailDir , '/tests/scripts/shim_memory_workload.py'.
  demo := importlib grailDir , '/lib/_grail_demo.so'.
  (GsFile existsOnServer: demo) ifFalse: [
    out nextPutAll: 'SHIM-MEMORY | skipped: lib/_grail_demo.so not built'; cr.
    ExitClientError signal: 'shim memory measurement skipped' status: 0]].
batch := (System gemEnvironmentVariable: 'GRAIL_SHIM_MEMORY_BATCH')
  ifNil: [400] ifNotNil: [:s | s asNumber].
batches := 5.
mod := importlib loadModuleFromPath: path name: 'shim_memory_workload'.
"A warm-up batch: the first calls import, fill caches and type mirrors,
which is memory kept once, not per call."
mod @env1:step: batch.
used := OrderedCollection new.
heap := OrderedCollection new.
1 to: batches do: [:i |
  mod @env1:step: batch.
  System _vmMarkSweep.
  used add: System _tempObjSpaceUsed.
  "A workload that defines memory() -- (allocated, released, quarantined,
  C heap bytes), from _grail_demo -- also reports the C side, which is what
  Step 1 frees: _tempObjSpaceUsed sees only Grail's objects."
  stats := [mod @env1:memory] on: Error do: [:e | e return: nil].
  out nextPutAll: 'SHIM-MEMORY | batch '; print: i;
    nextPutAll: ' | '; print: used last // 1024; nextPutAll: ' KB in use'.
  stats ifNotNil: [
    heap add: (stats at: 4).
    out nextPutAll: ' | allocated '; print: (stats at: 1);
      nextPutAll: ' | released '; print: (stats at: 2);
      nextPutAll: ' | quarantined '; print: (stats at: 3);
      nextPutAll: ' | C heap '; print: (stats at: 4) // 1024; nextPutAll: ' KB'].
  out cr].
first := used first.
last := used last.
perCall := (last - first) // ((batches - 1) * batch).
out nextPutAll: 'SHIM-MEMORY | '; nextPutAll: path;
  nextPutAll: ' | '; print: perCall;
  nextPutAll: ' bytes per call retained after a mark-sweep ('; print: (batches - 1) * batch;
  nextPutAll: ' calls)'; cr.
heap size = batches ifTrue: [
  out nextPutAll: 'SHIM-MEMORY | '; nextPutAll: path; nextPutAll: ' | ';
    print: (heap last - heap first) // ((batches - 1) * batch);
    nextPutAll: ' bytes of C heap per call'; cr].
ExitClientError signal: 'shim memory measured' status: 0
%
logout
! Reachable only when the run aborted before its ExitClientError status
! report -- fail loudly instead of exit 0.
exit 1
