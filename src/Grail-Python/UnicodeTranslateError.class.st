Class {
	#name : 'UnicodeTranslateError',
	#superclass : 'UnicodeError',
	#category : 'Grail-Exceptions'
}

{ #category : 'Grail-Python Attribute Access' }
UnicodeTranslateError >> ___fieldNames___ [
	"UnicodeTranslateError has no codec, so four: ``cls(object, start, end,
	reason)''."

	^ #(#object #start #end #reason)

]
