! ------------------- Superclass check
run
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- GrailMainRestart - re-run the top file in the namespace it chose
expectvalue /Class
doit
Exception subclass: 'GrailMainRestart'
  instVarNames: #(appName moduleClass)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
GrailMainRestart comment:
'Signalled by importlib class >> ___grailSetApp___: when a top file''s first
statement is gemdb.use_namespace(name), and handled by importlib class >>
___runTopFile___: (runPath: and runModule:), which drops the session-local
``__main__'''' it was running and runs the file again as the namespace''s
persistent one (docs/App_Namespaces_Design.md section 4).

A Smalltalk Exception, not a Python one, so no Python ``except'''' can take it.
None could anyway: the call is a top-level statement with only imports before
it, so no try statement is open around it.'
%

expectvalue /Class
doit
GrailMainRestart category: 'Grail-App Namespaces'
%

set compile_env: 0

category: 'Accessing'
method: GrailMainRestart
appName
	^ appName
%

category: 'Accessing'
method: GrailMainRestart
appName: aString
	appName := aString
%

category: 'Accessing'
method: GrailMainRestart
moduleClass
	"The session-local ``__main__'' class the first run built, to be dropped."

	^ moduleClass
%

category: 'Accessing'
method: GrailMainRestart
moduleClass: aClass
	moduleClass := aClass
%
