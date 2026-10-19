"Signalled by importlib class >> ___grailSetApp___: when a top file's first
statement is gemdb.use_namespace(name), and handled by importlib class >>
___runTopFile___: (runPath: and runModule:), which drops the session-local
``__main__'' it was running and runs the file again as the namespace's
persistent one (docs/App_Namespaces_Design.md section 4).

A Smalltalk Exception, not a Python one, so no Python ``except'' can take it.
None could anyway: the call is a top-level statement with only imports before
it, so no try statement is open around it."
Class {
	#name : 'GrailMainRestart',
	#superclass : 'Exception',
	#instVars : [
		'appName',
		'moduleClass'
	],
	#category : 'Grail-App Namespaces'
}

{ #category : 'Accessing' }
GrailMainRestart >> appName [
	^ appName

]

{ #category : 'Accessing' }
GrailMainRestart >> appName: aString [
	appName := aString

]

{ #category : 'Accessing' }
GrailMainRestart >> moduleClass [
	"The session-local ``__main__'' class the first run built, to be dropped."

	^ moduleClass

]

{ #category : 'Accessing' }
GrailMainRestart >> moduleClass: aClass [
	moduleClass := aClass

]
