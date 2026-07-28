# Python attributes vs. Smalltalk class structure

How Grail projects Python's single per-class namespace onto Smalltalk's several,
why a Python class attribute named `name` could corrupt the class, and the rule
that resolves it.

## TL;DR

- A Python class is an object (an instance of its metaclass), exactly like a
  Smalltalk class is an instance of *its* metaclass. Python keeps class members
  in **one** namespace (the class `__dict__`), keyed by string. Smalltalk splits
  a class's names across **several** namespaces (instance vars, instance methods,
  and — on the metaclass — class-side vars and methods).
- Grail's job is to **project** the one onto the several. The governing rule is:
  **isolate Python attributes in a Python-owned namespace by default; bridge to
  Smalltalk structure only on purpose.**
- One place violated that rule: a Python **class variable** whose name collides
  with an instance variable of the class *object* (e.g. `name`) was stored into
  that kernel slot, overwriting the class's real Smalltalk name. On GemStone 4.0
  (MR #6) that crashes `import django.utils.functional` (Django's `cached_property`
  has `name = None`).
- This is **not** an environment-0/environment-1 leak (that was investigated and
  disproved — env separation is correct) and **not** a "nameless class."

## The three `name`s

Around the single spelling `name` there are three distinct concepts. Django's
`cached_property` uses two of them:

```python
class cached_property:
    name = None                     # (2) a CLASS VARIABLE (default for instances)
    def __set_name__(self, owner, name):
        self.name = name            # (3) an INSTANCE VARIABLE (per-instance)
```

| # | concept | Python access | where it lives |
|---|---|---|---|
| 1 | the class's **name** | `cached_property.__name__` → `'cached_property'` | a `type` (metaclass) descriptor |
| 2 | a **class variable** `name` | `cached_property.name` → `None` | the class's own `__dict__` |
| 3 | an **instance variable** `name` | `inst.name` | each instance's `__dict__` |

Absent an assignment, only #1 exists — a bare class has no plain `name`
(`SomeClass.name` is an `AttributeError`), but always has `__name__`. Python
distinguishes #1 from #2/#3 by *key* (`__name__` vs `name`) and #2 from #3 by
*level* (class dict vs instance dict). You can even rename a class after creation
via `cls.__name__ = 'X'` (that rebinds the class's self-reported name, not the
module variable pointing at it).

## The namespace projection

Python and Smalltalk share the metaobject model — a class is an instance of its
metaclass — so the mapping is natural:

| Python | Smalltalk | kind |
|---|---|---|
| `cls.__name__` (a descriptor on `type`, reads the class name) | `Behavior>>name` (a metaclass-chain method, reads the name slot) | metaclass-level **structural** |
| `name = None` in the class body | data on the class object (a class-side slot) | user **class member** |
| `self.name = …` in a method | an instance slot | user **instance member** |

The projection Grail actually implements — cross-checked against what ships:

| Python construct | Grail mechanism | isolate or bridge |
|---|---|---|
| `__slots__` | real GemStone named instVars, **name-mangled** (`x` → `___slot_x___`) | **isolate** (private namespace) |
| plain instance attribute | per-instance dynamic instVars | **isolate** |
| plain class attribute | per-class `dynInstVars` holder (except the leak below) | **isolate** (should) |
| `__name__` | `Behavior>>name` | **bridge** (structural, and *should* be read+write) |
| `@property` | data descriptor (`__get__`/`__set__`) | **bridge** (deliberate, per-attribute) |
| `@smalltalk` | forward to an env-0 Smalltalk selector | **bridge** (deliberate, per-method) |
| adopt a Smalltalk class | `Python at: #Name put: aClass` + Python subclass + `@smalltalk` | **bridge** (deliberate) |

Everything is *isolate by default, bridge explicitly* — except the one leak.

## The leak: class attribute → kernel class-object instVar

`ClassDefAst` declares each class-body data attribute as a **class-side instance
variable** and generates env-1 accessors of the shape `attr → ^ attr` /
`attr: v → attr := v`. For a non-colliding name that is a fresh slot:

```
foo:  foo → ^ foo      foo: v → foo := v          (writes a new `foo` classInstVar)
```

But every class *object* already inherits ~19 structural instVars from the kernel
metaclass chain (`Behavior`/`ClassDescription`/`Class`/`Metaclass`/`Module`):

```
superClass format instVarsInfo instVarNames constraints classVars methDicts
poolDictionaries categorys dbTransientMask name classHistory transientMethDicts
destClass timeStamp userId extraDict classCategory subclasses
```

When a class-attribute name **is** one of those, GemStone does not create a
duplicate — the declared classInstVar **coalesces with the inherited slot**, so
the generated `name: v → name := v` writes the class's *real* name slot:

```
name:  name → ^ name   name: v → name := v        (writes the INHERITED kernel `name`)
```

Then `SomeClass name` (which `Behavior>>name` and everything structural reads)
returns the Python value — `'hello'`, or `None`. On GemStone 4.0 MR #6, the next
env-1 method compiled into that class runs the kernel
`GsPackagePolicy>>permitSessionMethodFor:selector:environmentId:`, whose line
`thisName := aBehavior thisClass name asSymbol` then evaluates `None asSymbol` →
`doesNotUnderstand:` → the Django import crashes. (On 3.7.5 the env-1 routing is
Grail's own patch, which never does `name asSymbol`, so the clobber sat there
silently — which is why prior 3.7.5 runs looked clean.)

### Scope (measured)

Only the class-object instVars that are **getter/setter pairs whose getter reads a
same-named instVar** actually clobber. That is exactly five: `name`,
`classHistory`, `timeStamp`, `userId`, `extraDict`. Of these only `name` is a
name real Python code uses (the others are camelCase Smalltalk-isms Python's
snake_case convention never produces), and only `name` crashes. Names like
`category`/`comment`/`description` do **not** clobber (their getters read
differently-named slots — `classCategory`, a computed comment); names without a
writable pair (`constraints`, `subclasses`, `format`, `instVarNames`, …) do
**not** clobber (they fall through to `dynInstVars`). So the practical blast
radius is `name`.

## The fix pattern: what `__slots__` already do

The instance side already solved this exact problem: `__slots__` become real
named instVars but are **mangled** (`x` → `___slot_x___`) precisely so a Python
slot named `x` can never alias a Smalltalk instVar named `x`. The class-attribute
path never got the equivalent discipline.

So the fix is not a new idea and not a `name` special case — it is to give class
attributes the same isolation slots already have. `ClassDefAst` normally backs a
class attribute `attr` with a same-named class-side instVar and env-1 accessors
(`attr → ^ attr` / `attr: v → attr := v`). For a reserved name that instVar
coalesces with the inherited kernel slot, so the setter overwrites it. The fix
gives reserved names a **mangled backing slot** — `name` is backed by
`___cattr_name___` (`attr → ^ ___cattr_name___` / `attr: v → ___cattr_name___ := v`),
declared as a fresh classInstVar that cannot coalesce. The accessor is *still
named* `name`, so nothing about Python access changes; only the physical slot
moves — exactly what `__slots__` do with `___slot_x___`. Then:

- `Foo.name` (Python read/write) → the `name` accessor → `___cattr_name___` — an
  ordinary Python class attribute, isolated.
- `Foo name` (Smalltalk) → the real class name slot, untouched.

The reserved set is computed reflectively as `Object class allInstVarNames` (a
kernel class's metaclass carries exactly the structural instVars, with none of
Grail's own additions like `__module__` / `dynInstVars`), so it tracks the kernel
automatically rather than hard-coding names.

Separately (and independently), the one *deliberate* bridge worth adding is
`__name__` ↔ the Smalltalk class name, made **read and write**, so `cls.__name__`
reports the name and `cls.__name__ = 'X'` renames — the structural spelling
Python actually uses, instead of the plain `name` the leak wrongly captured.

### Optional, for awareness

Because a Python author cannot know Smalltalk's internal instVar names, do **not**
turn overlaps into hard errors (that would reject valid Python — e.g. Django's
`class Meta: constraints = […]`, which works today). A non-fatal, dev-time
diagnostic ("this class attribute shadows a Smalltalk class slot") is the safe way
to surface cases for review without breaking code.

## What this is not

- **Not** an env-0/env-1 shadowing bug. A clean test (a plain class with an env-1
  `name` accessor, then an unqualified `name` send from an env-0 method vs an
  env-1 method) shows env separation is correct: the send resolves in the
  *sending method's* environment. The kernel got the Python value only because the
  class's *own name slot* had been overwritten.
- **Not** a "nameless class." The class has a perfectly good name; a routine class
  attribute overwrote it.
