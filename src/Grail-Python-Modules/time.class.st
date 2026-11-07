"Python time module - wall-clock, monotonic, and sleep primitives
backed by GemStone DateTime + Delay.

Notes:
  * Smalltalk DateTime stores year + dayOfYear + msAfterMidnight, so
    sub-second resolution comes through.
  * time.time() and time.monotonic() are both wall-clock derived; the
    distinction CPython draws (monotonic guarantees no rewind) is not
    enforced here.  Fine for itsdangerous timestamping and Werkzeug
    request timing; if you depend on strict monotonicity, sample once
    and compare deltas only.
  * sleep() uses GemStone Delay, which schedules at the VM level."
Class {
	#name : 'time',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Formatting' }
time class >> ___centuryDirective___: aCharacter year: aYear month: aMonth day: aDay [

	"The directive %aCharacter as wrap_strftime rewrites it for a year before
	1000, or unchanged when it is no year directive.  %G's is the ISO year,
	which may be the year before or after."

	| padded |

	padded := self ___fourDigits___: aYear.
	aCharacter = $Y ifTrue: [^ padded].
	aCharacter = $G ifTrue: [
		^ self ___fourDigits___: (self @env1:instance @env1:___isoYear___: aYear month: aMonth day: aDay)].
	aCharacter = $F ifTrue: [^ padded , '-%m-%d'].
	aCharacter = $C ifTrue: [^ padded copyFrom: 1 to: padded size - 2].
	^ String with: $% with: aCharacter

]

{ #category : 'Grail-Private' }
time class >> ___epochDaysForYear___: y _month: m _day: d [
	"Days since 1970-01-01 for a civil date; timezone-free."

	^ (Date newDay: d monthNumber: m year: y) asDays - time ___unixEpochDays___

]

{ #category : 'Grail-Private' }
time class >> ___epochSecondsFromGmtOf___: dt [
	"Whole Unix-epoch seconds for the instant `dt`, read through its *Gmt
	accessors and converted with pure civil-calendar arithmetic (see
	___unixEpochDays___ for why not asSeconds)."

	^ (time ___epochDaysForYear___: dt yearGmt _month: dt monthGmt _day: dt dayOfMonthGmt)
		* 86400
		+ (dt hourGmt * 3600)
		+ (dt minuteGmt * 60)
		+ dt secondGmt

]

{ #category : 'Grail-Formatting' }
time class >> ___fourDigits___: aYear [

	"aYear, a date's, as C's ``%04ld'' prints it."

	| digits |

	digits := aYear printString.
	[digits size < 4] whileTrue: [digits := '0' , digits].
	^ digits

]

{ #category : 'Grail-Formatting' }
time class >> ___normalizingCenturyOf___: aFormat year: aYear month: aMonth day: aDay [

	"aFormat with the %Y, %G, %F and %C of a date before the year 1000 written
	out with the year padded to four digits, as _datetimemodule.c's
	wrap_strftime writes them (Modules/_datetimemodule.c:1959-2010), so that a
	C library that does not pad it -- glibc does not -- still answers
	date(1, 1, 1).strftime('%Y') as '0001'.  The scan steps over whole
	directives, so ``%%Y'' stays a literal."

	| stream index |

	aYear >= 1000 ifTrue: [^ aFormat].
	stream := WriteStream on: Unicode7 new.
	index := 1.
	[index <= aFormat size] whileTrue: [
		((aFormat at: index) = $% and: [index < aFormat size])
			ifTrue: [
				stream nextPutAll: (self
					___centuryDirective___: (aFormat at: index + 1)
					year: aYear
					month: aMonth
					day: aDay).
				index := index + 2]
			ifFalse: [
				stream nextPut: (aFormat at: index).
				index := index + 1]].
	^ stream contents

]

{ #category : 'Grail-Private' }
time class >> ___substituteMicroseconds___: fmt _: micros [
	"Expand the %f directive to 6-digit zero-padded microseconds BEFORE
	handing the format to the struct_time formatter.  struct_time has no
	sub-second field, so %f cannot be resolved there -- CPython's
	datetime.strftime runs the same pre-pass.  The scan steps over whole
	directives so an escaped ``%%f'' keeps its literal ``f'', and a lone
	trailing ``%'' is passed through untouched.

	(Named `fmt', not `format': ``format'' is already declared as a
	global -- Python's builtin -- and shadowing it is a compile error.)"

	| ws i sz us c |
	us := micros printString.
	[us size < 6] whileTrue: [us := '0' , us].
	ws := WriteStream on: Unicode7 new.
	i := 1.
	sz := fmt size.
	[i <= sz] whileTrue: [
		c := fmt at: i.
		((c = $%) and: [i < sz])
			ifTrue: [
				(fmt at: i + 1) = $f
					ifTrue: [ws nextPutAll: us]
					ifFalse: [ws nextPut: c; nextPut: (fmt at: i + 1)].
				i := i + 2]
			ifFalse: [
				ws nextPut: c.
				i := i + 1]].
	^ ws contents

]

{ #category : 'Grail-Private' }
time class >> ___unixEpochDays___ [
	"Date>>asDays for 1970-01-01, the anchor for all epoch<->civil
	conversions here.

	Epoch math deliberately goes through Date (pure civil-calendar day
	counting, no timezone) rather than DateTime>>asSeconds.  asSeconds
	bakes in the gem's STANDARD UTC offset, so the difference between two
	asSeconds values that straddle a DST boundary is off by the DST shift
	-- e.g. with the default US/Pacific zone, `DateTime now asSeconds -
	(DateTime newGmtWithYear: 1970 ...) asSeconds' ran a full hour ahead
	of the true Unix epoch every summer, which is what made time.time()
	(and everything derived from it) wrong half the year."

	^ 25202

]
