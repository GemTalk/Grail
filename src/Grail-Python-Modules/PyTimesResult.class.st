"
os.times_result: the user, system, children's and elapsed times os.times() answers,
a struct sequence (Modules/posixmodule.c, TimesResultType).
"
Class {
	#name : 'PyTimesResult',
	#superclass : 'PyStructSequence',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Fields' }
PyTimesResult class >> ___sequenceNames___ [
	^ #(#'user' #'system' #'children_user' #'children_system' #'elapsed')

]

{ #category : 'Grail-Fields' }
PyTimesResult class >> ___typeName___ [
	^ 'posix.times_result'

]
