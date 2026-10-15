"Python warnings module - issue warnings and manage filter rules.

Minimal surface for itsdangerous / Werkzeug / Flask:
  warn(message[, category])          - emit a warning
  simplefilter(action[, category])   - install a single filter
  filterwarnings(action, ...)        - append a filter
  resetwarnings()                    - clear all filters
  catch_warnings(record=False)       - context manager
  formatwarning(...)                 - render to text

Filter actions: ignore / error / always / default / module / once.
Default behavior matches CPython on a fresh interpreter: warnings
print to Transcript once per (message, category) site."
Class {
	#name : 'warnings',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}
