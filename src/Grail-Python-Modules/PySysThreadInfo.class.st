"
sys.thread_info: the thread implementation, a struct sequence of name, lock and version (Python/thread.c, PyThread_GetInfo).
Grail's Python threads are GemStone processes, which are none of the implementations CPython names, so each field is None: lock and version are None by their documented meaning, unknown, and test_sys's test_thread_info admits None for name too.
"
Class {
	#name : 'PySysThreadInfo',
	#superclass : 'PyStructSequence',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Fields' }
PySysThreadInfo class >> ___sequenceNames___ [
	^ #(#'name' #'lock' #'version')

]

{ #category : 'Grail-Fields' }
PySysThreadInfo class >> ___sysInstance___ [
	^ self ___sequence___: { None. None. None } named: nil

]

{ #category : 'Grail-Fields' }
PySysThreadInfo class >> ___typeName___ [
	^ 'sys.thread_info'

]
