/*
 * Mavo Unit: Super class that Scope and Primitive inherit from
 */
(function($, $$) {

var _ = Mavo.Unit = $.Class({
	abstract: true,
	extends: Mavo.Node,
	constructor: function(element, mavo, o = {}) {
		this.constructor.all.set(this.element, this);

		this.collection = o.collection;

		if (this.collection) {
			// This is a collection item
			this.scope = this.parentScope = this.collection.parentScope;
		}

		if (!this.fromTemplate(["computed", "required"])) {
			this.computed = Mavo.is("computed", this.element);
			this.required = Mavo.is("required", this.element);
		}

		Mavo.hooks.run("unit-init-end", this);
	},

	/**
	 * Check if this unit is either deleted or inside a deleted scope
	 */
	isDeleted: function() {
		var ret = this.deleted;

		if (this.deleted) {
			return true;
		}

		return !!this.parentScope && this.parentScope.isDeleted();
	},

	getData: function(o) {
		o = o || {};

		var isNull = unit => !unit.everSaved && !o.dirty ||
		                      unit.deleted && o.dirty ||
		                      unit.computed && !o.computed ||
		                      unit.placeholder;

		if (isNull(this)) {
			return null;
		}

		// Check if any of the parent scopes doesn't return data
		this.walkUp(scope => {
			if (isNull(scope)) {
				return null;
			}
		});
	},

	lazy: {
		closestCollection: function() {
			if (this.collection) {
				return this.collection;
			}

			return this.walkUp(scope => {
				if (scope.collection) {
					return scope.collection;
				}
			}) || null;
		}
	},

	live: {
		deleted: function(value) {
			this.element.classList.toggle("deleted", value);

			if (value) {
				// Soft delete, store element contents in a fragment
				// and replace them with an undo prompt.
				this.elementContents = document.createDocumentFragment();
				$$(this.element.childNodes).forEach(node => {
					this.elementContents.appendChild(node);
				});

				$.contents(this.element, [
					"Deleted " + this.name,
					{
						tag: "button",
						textContent: "Undo",
						events: {
							"click": evt => this.deleted = false
						}
					}
				]);

				this.element.classList.remove("delete-hover");
			}
			else if (this.deleted) {
				// Undelete
				this.element.textContent = "";
				this.element.appendChild(this.elementContents);

				// otherwise expressions won't update because this will still seem as deleted
				// Alternatively, we could fire datachange with a timeout.
				this._deleted = false;

				$.fire(this.element, "mavo:datachange", {
					unit: this.collection,
					mavo: this.mavo,
					action: "undelete",
					item: this
				});
			}
		},

		unsavedChanges: function(value) {
			if (this.placeholder) {
				value = false;
			}

			this.element.classList.toggle("unsaved-changes", value);

			return value;
		},

		placeholder: function(value) {
			this.element.classList.toggle("placeholder", value);
		}
	},

	static: {
		get: function(element, prioritizePrimitive) {
			var scope = Mavo.Scope.all.get(element);

			return (prioritizePrimitive || !scope)? Mavo.Primitive.all.get(element) : scope;
		},

		create: function(element, mavo, o = {}) {
			if (!element || !mavo) {
				throw new TypeError("Mavo.Unit.create() requires an element argument and a mavo object");
			}

			return new Mavo[Mavo.is("scope", element)? "Scope" : "Primitive"](element, mavo, o);
		}
	}
});

})(Bliss, Bliss.$);
