Extension { #name : 'unicode_names' }

{ #category : 'Grail-Unicode Names' }
unicode_names >> codepoint_for_name: aName [
	"Python: unicode_names.codepoint_for_name(name) -> int or None."

	^ (unicode_names @env0:___codePointForName: aName) @env0:ifNil: [None]

]

{ #category : 'Grail-Unicode Names' }
unicode_names >> name_for_codepoint: aCodePoint [
	"Python: unicode_names.name_for_codepoint(cp) -> str or None."

	^ (unicode_names @env0:___nameForCodePoint: aCodePoint) @env0:ifNil: [None]

]
