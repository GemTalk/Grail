! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for CrossVersionSelectorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'CrossVersionSelectorTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%
expectvalue /Class
doit
CrossVersionSelectorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! CrossVersionSelectorTestCase — Grail source must not send kernel selectors that
! the OLDEST supported GemStone lacks.
!
! Grail supports 3.7.x and 4.0+.  A selector that exists only on the newer kernel
! compiles and passes everywhere on a 4.0 developer machine, and then fails at RUN
! time on 3.7.5 -- which in practice means it fails in CI, several minutes after
! the push, with only the test NAME recorded in the shard log.  That is a slow and
! confusing way to learn about a one-word portability slip.
!
! This test is the fast local signal: it fails ON 4.0, in seconds, without needing
! a 3.7.5 stone.
!
! Motivating case (2026-07-30): ``Character value: 124'' in
! functools>>___annotationUnionOfClasses___:.  It exists on 4.0 and NOT on 3.7.5
! (``a Character class does not understand #value:''), so every caller died there
! while all seven new tests passed locally on 4.0.  Verified alternatives that
! work on BOTH: ``Character withValue:'', ``Character codePoint:'', a bare $|
! literal, and ``('|' at: 1)''.
!
! Two things a naive grep for ``Character value:'' would get wrong, both of which
! this test handles:
!
!   * It would MISS the actual bug, which was written ``Character @env0:value:''.
!     Grail's env-prefixed send syntax puts ``@env0:'' between receiver and
!     selector, so the prefixes are blanked before matching.
!   * It would HIT the comment in functools.gs that documents this very pitfall.
!     Comments and string literals are blanked before matching, so prose about a
!     banned selector is fine -- only real sends are reported.
!
! Scope and limits, stated so nobody over-trusts it:
!   * DENYLIST, not a proof of portability.  It catches selectors somebody has
!     already been bitten by.  Adding one is a single line in bannedSends.
!   * TEXTUAL adjacency only.  ``c := Character. c value: 1'' is not caught, nor
!     is a send split across two lines.  Both are unusual; the realistic shape is
!     receiver and selector adjacent on one line.
!   * Needs the SOURCE TREE, so it self-skips when the checkout is absent (a
!     deployed image).  That is a real hole: a deployed image runs the test as a
!     silent pass.  CI always has the tree.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
CrossVersionSelectorTestCase removeAllMethods.
CrossVersionSelectorTestCase class removeAllMethods.
%

set compile_env: 0

! ------------------- The denylist

category: 'Grail-Tests-CrossVersionSelector'
method: CrossVersionSelectorTestCase
bannedSends
	"{ receiver-class-name . selector . guidance } for each send that the OLDEST
	supported GemStone (3.7.x) does not understand.

	Add a row whenever a version-only selector bites.  Keep the guidance short
	and concrete -- it is what the failure message shows."

	^ Array
		with: (Array
			with: 'Character'
			with: 'value:'
			with: 'absent on 3.7.5 -- index a one-character String instead, or use Character withValue: / Character codePoint:')
%

! ------------------- Which files to scan

category: 'Grail-Tests-CrossVersionSelector'
method: CrossVersionSelectorTestCase
grailSourceDirectories
	"Directories holding Grail's own Smalltalk sources, relative to grailDir."

	^ #( 'src/smalltalk' 'src/smalltalk/Python' 'src/smalltalk/PythonAst'
	     'src/smalltalk/PythonTests' 'scripts' )
%

category: 'Grail-Tests-CrossVersionSelector'
method: CrossVersionSelectorTestCase
grailSourceFiles
	"Absolute paths of every .gs file in grailSourceDirectories.  Answers an
	EMPTY collection when the source tree is absent, which the tests treat as
	``skip'' rather than ``pass'' as loudly as SUnit allows."

	| root paths |
	root := importlib grailDir.
	paths := OrderedCollection new.
	self grailSourceDirectories do: [:rel |
		| dir entries |
		dir := root , '/' , rel.
		entries := [GsFile contentsOfDirectory: dir onClient: false]
			on: Error do: [:ex | ex return: nil].
		entries isNil ifFalse: [
			entries do: [:each |
				| name |
				"contentsOfDirectory: answers full paths on some versions and bare
				names on others -- normalise by taking the trailing component."
				name := each asString.
				(name size >= 3 and: [(name copyFrom: name size - 2 to: name size) = '.gs'])
					ifTrue: [
						paths add: ((name includes: ('/' at: 1)) ifTrue: [name] ifFalse: [dir , '/' , name])]]]].
	^ paths
%

! ------------------- Blanking comments, string literals and env prefixes

category: 'Grail-Tests-CrossVersionSelector'
method: CrossVersionSelectorTestCase
blankNonCode: aLine inComment: wasInComment into: aBlock
	"Copy aLine with STRING-LITERAL and COMMENT content replaced by spaces, and
	``@env0:'' / ``@env1:'' prefixes replaced by spaces, preserving length so
	column positions stay meaningful.  Evaluates aBlock with the blanked line and
	the still-in-comment flag for the NEXT line.

	Smalltalk quoting: comments are double-quoted, string literals
	single-quoted, and a doubled quote is an escape inside either.  A double
	quote inside a string starts no comment, and a single quote inside a comment
	starts no string -- so both states must be tracked together rather than
	stripped in two passes.

	A topaz directive line (first non-blank character is ``!'') is blanked
	entirely: those are file-level comments and may contain anything."

	| out inComment inString i sz ch trimmed quote dquote |
	"Both quote characters are derived from STRING LITERALS rather than written
	as dollar-quote character literals.  A bare quote character literal
	desynchronises the lexer here: the single-quote form reads as the start of a
	string, and the double-quote form CLOSES the very comment it appears in.
	That cost three failed compiles, the last one from this comment itself.
	Inside a string literal neither character is special."
	quote := '''''''' at: 1.
	dquote := '"' at: 1.
	sz := aLine size.
	out := String new: sz.
	1 to: sz do: [:k | out at: k put: (' ' at: 1)].
	trimmed := aLine trimSeparators.
	(trimmed isEmpty not and: [(trimmed at: 1) == ('!' at: 1)])
		ifTrue: [^ aBlock value: out value: wasInComment].
	inComment := wasInComment.
	inString := false.
	i := 1.
	"Flat state machine on purpose.  The first version nested ifTrue:/ifFalse:
	four deep and shipped one closing bracket too many, which the compiler
	reported as an unexpected token several lines later -- exactly the trap
	docs/Parenthesis_Checklist.md is about.  Three shallow branches are harder to
	get wrong than a correct-but-unreadable nest.

	Doubled-quote ESCAPES are not modelled: an embedded quote flips the state
	twice, so a string like 'it''s' tracks as two adjacent strings.  Harmless for
	this check, which only asks whether a banned receiver-and-selector pair sits
	in live code; it would take a doubled quote AND a banned send inside the same
	literal to mislead it."
	[i <= sz] whileTrue: [
		ch := aLine at: i.
		inComment
			ifTrue: [ch == dquote ifTrue: [inComment := false]]
			ifFalse: [
				inString
					ifTrue: [ch == quote ifTrue: [inString := false]]
					ifFalse: [self ___copyOrOpen___: ch at: i from: aLine into: out
						quote: quote dquote: dquote
						state: [:isComment :isString |
							inComment := isComment. inString := isString]]].
		i := i + 1].
	^ aBlock value: (self blankEnvPrefixesIn: out) value: inComment
%

category: 'Grail-Tests-CrossVersionSelector'
method: CrossVersionSelectorTestCase
___copyOrOpen___: ch at: anIndex from: aLine into: out quote: quote dquote: dquote state: aBlock
	"One character of ordinary code: either it OPENS a comment or a string, or it
	is copied through to the blanked line.  Split out of blankNonCode: purely to
	keep that loop shallow -- see the note there."

	ch == dquote ifTrue: [^ aBlock value: true value: false].
	ch == quote ifTrue: [^ aBlock value: false value: true].
	out at: anIndex put: ch.
	^ aBlock value: false value: false
%

category: 'Grail-Tests-CrossVersionSelector'
method: CrossVersionSelectorTestCase
blankEnvPrefixesIn: aLine
	"Replace every @env<digit>: with spaces, preserving length.  Grail writes a
	cross-environment send as ``Receiver @env0:selector: arg'', so the prefix sits
	between receiver and selector and would defeat plain adjacency matching --
	which is exactly how the motivating bug was written."

	| out i sz space |
	out := aLine copy.
	sz := out size.
	space := ' ' at: 1.
	i := 1.
	[i + 5 <= sz] whileTrue: [
		(self isEnvPrefixAt: i in: out)
			ifTrue: [
				i to: i + 5 do: [:k | out at: k put: space].
				i := i + 6]
			ifFalse: [i := i + 1]].
	^ out
%

category: 'Grail-Tests-CrossVersionSelector'
method: CrossVersionSelectorTestCase
isEnvPrefixAt: anIndex in: aString
	"True when aString carries @env<digit>: starting at anIndex.  One guard per
	line: the inlined four-deep and: nest this replaced shipped a stray closing
	bracket, which surfaced as a parenthesis error two lines further on."

	((aString at: anIndex) == ('@' at: 1)) ifFalse: [^ false].
	((aString copyFrom: anIndex + 1 to: anIndex + 3) = 'env') ifFalse: [^ false].
	((aString at: anIndex + 4) isDigit) ifFalse: [^ false].
	^ (aString at: anIndex + 5) == (':' at: 1)
%


! ------------------- Matching

category: 'Grail-Tests-CrossVersionSelector'
method: CrossVersionSelectorTestCase
line: aLine sends: aSelector to: aClassName
	"True when the blanked aLine contains ``aClassName'' followed by whitespace
	and then ``aSelector''.  The receiver name must be a whole token, so
	``MyCharacter value:'' does not match."

	| idx sz nameSz j |
	sz := aLine size.
	nameSz := aClassName size.
	idx := 1.
	[idx > 0] whileTrue: [
		idx := aLine indexOfSubCollection: aClassName startingAt: idx.
		idx == 0 ifTrue: [^ false].
		"Whole-token receiver: no identifier character immediately before."
		((idx == 1)
			or: [((aLine at: idx - 1) isAlphaNumeric not) and: [(aLine at: idx - 1) ~~ ('_' at: 1)]])
			ifTrue: [
				j := idx + nameSz.
				"Skip the whitespace (and blanked env prefix) between the two."
				[j <= sz and: [(aLine at: j) isSeparator]] whileTrue: [j := j + 1].
				(j + aSelector size - 1 <= sz
					and: [(aLine copyFrom: j to: j + aSelector size - 1) = aSelector])
					ifTrue: [^ true]].
		idx := idx + 1].
	^ false
%

category: 'Grail-Tests-CrossVersionSelector'
method: CrossVersionSelectorTestCase
offendingSends
	"Every banned send found in Grail's Smalltalk sources, as printable
	``path:line  Receiver selector -- guidance'' strings."

	| offenders files banned root |
	offenders := OrderedCollection new.
	files := self grailSourceFiles.
	root := importlib grailDir.
	banned := self bannedSends.
	files do: [:path |
		| f line lineNo inComment |
		f := [GsFile openReadOnServer: path] on: Error do: [:ex | ex return: nil].
		f isNil ifFalse: [
			lineNo := 0.
			inComment := false.
			[(line := f nextLine) isNil] whileFalse: [
				lineNo := lineNo + 1.
				self
					blankNonCode: line
					inComment: inComment
					into: [:blanked :stillInComment |
						inComment := stillInComment.
						banned do: [:row |
							(self line: blanked sends: (row at: 2) to: (row at: 1)) ifTrue: [
								| shown |
								shown := (path size > root size and: [(path copyFrom: 1 to: root size) = root])
									ifTrue: [path copyFrom: root size + 2 to: path size]
									ifFalse: [path].
								offenders add: shown , ':' , lineNo printString , '  '
									, (row at: 1) , ' ' , (row at: 2) , ' -- ' , (row at: 3)]]]].
			f close]].
	^ offenders
%

! ------------------- The tests

category: 'Grail-Tests-CrossVersionSelector'
method: CrossVersionSelectorTestCase
testSourceTreeIsScannable
	"Guard the guard.  offendingSends answers empty both when the source is clean
	AND when no source was found, so without this a checkout-less image would
	report a silent pass and the whole check would be worthless."

	| files |
	files := self grailSourceFiles.
	self assert: files size > 50
		description: 'expected to find Grail .gs sources to scan, found '
			, files size printString
			, ' (is the source tree present? this check needs it)'
%

category: 'Grail-Tests-CrossVersionSelector'
method: CrossVersionSelectorTestCase
testNoSendsMissingFromOldestSupportedGemStone
	"Grail source must not send a kernel selector that 3.7.x lacks."

	| offenders |
	offenders := self offendingSends.
	self assert: offenders isEmpty
		description: 'Grail source sends selectors the oldest supported GemStone '
			, '(3.7.x) does not understand -- these compile and pass on 4.0 and '
			, 'fail at RUN time on 3.7.5:'
			, (String with: Character lf)
			, ((offenders inject: '' into: [:acc :each |
					acc , '  ' , each , (String with: Character lf)]))
%

category: 'Grail-Tests-CrossVersionSelector'
method: CrossVersionSelectorTestCase
testMatcherIgnoresCommentsAndStrings
	"Prose about a banned selector must not trip the check -- functools.gs
	documents ``Character value:'' in a comment precisely because it is banned,
	and a naive grep fails on that comment."

	| banned |
	banned := (self bannedSends at: 1).
	self
		blankNonCode: '	"a comment mentioning Character value: 124"'
		inComment: false
		into: [:blanked :inComment |
			self deny: (self line: blanked sends: (banned at: 2) to: (banned at: 1))
				description: 'a COMMENT must not count as a send'].
	self
		blankNonCode: '	msg := ''Character value: is banned''.'
		inComment: false
		into: [:blanked :inComment |
			self deny: (self line: blanked sends: (banned at: 2) to: (banned at: 1))
				description: 'a STRING LITERAL must not count as a send']
%

category: 'Grail-Tests-CrossVersionSelector'
method: CrossVersionSelectorTestCase
testMatcherFindsPlainAndEnvPrefixedSends
	"Both spellings must be caught.  The env-prefixed one is the shape the
	motivating bug was actually written in, and a plain grep for
	``Character value:'' would have missed it entirely."

	| banned |
	banned := (self bannedSends at: 1).
	self
		blankNonCode: '	bar := Character value: 124.'
		inComment: false
		into: [:blanked :inComment |
			self assert: (self line: blanked sends: (banned at: 2) to: (banned at: 1))
				description: 'a plain send must be caught'].
	self
		blankNonCode: '	bar := Character @env0:value: 124.'
		inComment: false
		into: [:blanked :inComment |
			self assert: (self line: blanked sends: (banned at: 2) to: (banned at: 1))
				description: 'an @env0:-prefixed send must be caught'].
	self
		blankNonCode: '	bar := Character' , (String with: Character tab) , '@env1:value: 124.'
		inComment: false
		into: [:blanked :inComment |
			self assert: (self line: blanked sends: (banned at: 2) to: (banned at: 1))
				description: 'an @env1:-prefixed send must be caught']
%

category: 'Grail-Tests-CrossVersionSelector'
method: CrossVersionSelectorTestCase
testMatcherRequiresAWholeTokenReceiver
	"``MyCharacter value:'' is a different class and must not be reported."

	| banned |
	banned := (self bannedSends at: 1).
	self
		blankNonCode: '	bar := MyCharacter value: 124.'
		inComment: false
		into: [:blanked :inComment |
			self deny: (self line: blanked sends: (banned at: 2) to: (banned at: 1))
				description: 'a longer identifier ending in the class name must not match']
%

category: 'Grail-Tests-CrossVersionSelector'
method: CrossVersionSelectorTestCase
testMultiLineCommentStaysBlanked
	"A comment spanning lines must keep suppressing matches on its later lines,
	which is why the blanking carries an in-comment flag between lines."

	| banned afterFirst |
	banned := (self bannedSends at: 1).
	afterFirst := nil.
	self
		blankNonCode: '	"opening a comment here'
		inComment: false
		into: [:blanked :inComment | afterFirst := inComment].
	self assert: afterFirst equals: true.
	self
		blankNonCode: '	 still inside, Character value: 124"'
		inComment: afterFirst
		into: [:blanked :inComment |
			self deny: (self line: blanked sends: (banned at: 2) to: (banned at: 1))
				description: 'a continuation line of a comment must not count as a send']
%
