"
os.uname_result: the five names uname(2) answers -- the system, the network
node, the release and version of the system, and the machine -- a struct
sequence (Modules/posixmodule.c, UnameResultType).
"
Class {
	#name : 'PyUnameResult',
	#superclass : 'PyStructSequence',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Fields' }
PyUnameResult class >> ___sequenceNames___ [
	^ #(#'sysname' #'nodename' #'release' #'version' #'machine')

]

{ #category : 'Grail-Fields' }
PyUnameResult class >> ___typeName___ [
	^ 'posix.uname_result'

]
