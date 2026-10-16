! ------------------- Superclass check
run
Notification ifNil: [self error: 'Notification is not defined. Check file ordering.'].
%

! ------- GrailDynLoadRequest - an extension load C must do itself
expectvalue /Class
doit
Notification subclass: 'GrailDynLoadRequest'
  instVarNames: #(moduleName path)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
GrailDynLoadRequest comment:
'Signalled by CPythonShim class>>loadDynamicModule:fromPath: before it loads a
.so, so that an import C started can do the load in C instead.

GemStone allows two user actions in flight.  Loading an extension is one (the
shimDynLoad user action runs its exec slots), and a Cython module''s exec slot
imports its siblings: numpy.random._bounded_integers imports bit_generator,
which imports _common -- three loads deep, three user actions, and the third
is refused.  So an import that C asks for (CPythonShim>>
PyImport_ImportModuleLevel:globals:locals:fromlist:level:) handles this
request: it records the module name and path and returns to C, which runs
shimDynLoad as a plain C call inside the user action already in flight, then
has the server finish the module (finishDynLoad:path:methodNames:) and asks
for the import again.

A Notification, so with no such import on the stack signal answers nil and
the load goes ahead as a user action, exactly as before.  The handler is in
the same callback as the signal, so its ex return: unwinds no C frame.'
%

expectvalue /Class
doit
GrailDynLoadRequest category: 'Grail-Shim'
%

set compile_env: 0

category: 'Accessing'
method: GrailDynLoadRequest
moduleName
	^ moduleName
%

category: 'Accessing'
method: GrailDynLoadRequest
path
	^ path
%

category: 'Initializing'
method: GrailDynLoadRequest
moduleName: aString path: aPathString
	moduleName := aString.
	path := aPathString
%
