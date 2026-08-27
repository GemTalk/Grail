! ------------------- Superclass check
run
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- PythonLoopDrained - internal signal: a loop's iterator is exhausted
expectvalue /Class
doit
Exception subclass: 'PythonLoopDrained'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PythonLoopDrained comment:
'Internal signal: a for-loop''s (or comprehension clause''s) iterator
reported exhaustion AT THE STEP.

CPython ends a loop only when the StopIteration (StopAsyncIteration for
``async for'') comes from the __next__ / awaited-__anext__ call itself; one
raised by the TARGET STORE (``for tgt[0] in ...'' with a raising
__setitem__), by the BODY, or by the iterable''s own __iter__ propagates to
the caller.  Grail''s loop emission used to wrap the whole loop -- init,
step, store and body -- in one ``on: StopIteration'' handler, so all of
those were silently mistaken for a drained loop
(test_coroutines'' test_for_assign_raising_stop_async_iteration).

So the STEP alone is guarded: it rescues the exhaustion exception and
re-signals THIS class, which the loop-level handler catches where it used
to catch StopIteration -- same placement, so for-else still runs on a
natural drain and PythonBreak still skips it.  Nothing user-visible ever
carries this signal.'
%

expectvalue /Class
doit
PythonLoopDrained category: 'Exceptions'
%

! ------------------- Remove existing behavior from PythonLoopDrained
removeallmethods PythonLoopDrained
removeallclassmethods PythonLoopDrained

set compile_env: 0

category: 'Signalling'
classmethod: PythonLoopDrained
___signal___
	"Opt out of the VM's raise-time stack capture, exactly as PythonBreak
	does -- every loop signals this once at its natural end, and a captured
	stack would be pure cost."

	| ex |
	ex := self new.
	ex @env0:_gsStack: #().
	^ ex signal
%

set compile_env: 0
