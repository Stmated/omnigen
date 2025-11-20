import {AnyJsonDefinition} from './JsonSchemaParser.ts';
import {JSONSchema9, PROP_NAME_HINT} from '../definitions';
import {Arrayable, TypeName} from '@omnigen/api';
import {Case, Naming} from '@omnigen/core';

export interface NameOptions {
  /**
   * If the schema originates from some kind of map/dictionary, such as $defs, then this is the key of that map.
   * If given, we will trust that it is a good name based on the context where it was found.
   */
  key?: TypeName | undefined;

  /**
   * Hard-coded alternatives that can be given from the outside. Names that cannot be deduced by the schema itself, but that are fully trustworthy.
   *
   * TODO: This is a quite ugly workaround for the OpenRpc toOmniOutputFromContentDescriptor -- should be able to solve this some other (better) way
   */
  alternatives?: TypeName | undefined;
  /**
   * If there is a clear owner of the schema, then that owner's name can help us properly name our type.
   * If given, we will trust that it is a good name based on the context where it was found.
   */
  ownerName?: TypeName | undefined;
  preferredOwnerName?: TypeName | undefined;

  /**
   * TODO: Can be removed since it is never actually set by anything?
   */
  suffix?: TypeName | undefined,
  // suffixPrioritized?: boolean;

  /**
   * Only to be used for fallbacks if all else fails, for things like index inside a list or other non-descriptive things that might change based on structure of document.
   *
   * TODO: Split to a separate one that signifies "do not apply if direct ref"?
   */
  fallbackSuffix?: TypeName | undefined;
  preferSuffix?: TypeName | undefined;

  onlyExplicit?: boolean;
}

interface TypeSuffix {
  type?: Arrayable<string> | undefined;
  format?: string | undefined;
}

const DEFAULT_OPTIONS: NameOptions = {};

export class JsonSchemaNameParser {

  // TODO: If "explicitOnly" then $comment of resolved schema should not be used!
  //        So we should never end up with a `FixedFields10`

  public parse(
    unresolved: AnyJsonDefinition<JSONSchema9>,
    resolved?: AnyJsonDefinition<JSONSchema9> | undefined,
    nameOptions?: NameOptions | undefined,
  ): TypeName | undefined {

    if (unresolved === resolved) {
      resolved = undefined;
    }

    if (!nameOptions) {
      nameOptions = DEFAULT_OPTIONS;
    }

    const names_from_parent: TypeName[] = [];
    const names: TypeName[] = [];

    let unresolved_properties_suffixes: TypeName[] | undefined = undefined;
    let parent_properties_suffixes: TypeName[] | undefined = undefined;
    let type_suffixes: TypeSuffix | undefined = undefined;

    let isDirectRef = false;

    let insertKeyIndex = 0;

    // const names_suffixes: TypeName[] = [];

    // if (unresolved === true) {
    //   names_suffixes.push('Always');
    // } else if (unresolved === false) {
    //   names_suffixes.push('Never');
    // }
    //
    // if (resolved === true) {
    //   names_suffixes.push('AlwaysExt');
    // } else if (resolved === false) {
    //   names_suffixes.push('NeverExt');
    // }

    if (unresolved && typeof unresolved === 'object') {

      if ((unresolved.$ref || unresolved.$dynamicRef) && Object.keys(unresolved).length === 1) {
        isDirectRef = true;
        // Remove most name options, since they no longer apply if we've moved away in the document.
        nameOptions = {
          // ownerName: nameOptions.requireOwnerName ? nameOptions.ownerName : undefined,
          // requireOwnerName: nameOptions.requireOwnerName,
        };

      }/* else if (nameOptions.preferOwnerName) {
        // TODO: What to do here?
        nameOptions = {...nameOptions, requireOwnerName: true} satisfies NameOptions;
      }*/

      this.addIfDefined(names, this.getNameHint(unresolved));

      insertKeyIndex = names.length;

      this.addIfDefined(names, Naming.parse(unresolved.$id));
      this.addIfDefined(names, unresolved.title);
      this.addIfDefined(names, Naming.parse(unresolved.$schema));

      const derefComment = Naming.parseToParts(unresolved.$comment);
      if (derefComment && derefComment.protocol && derefComment.hashes.length > 0) {
        this.addIfDefined(names, derefComment.hashes[0]);
      }

      const dynamicAnchorParts = Naming.parseToParts(unresolved.$dynamicAnchor, true, true);
      this.addIfDefined(names, Naming.parse(dynamicAnchorParts?.at));
      this.addIfDefined(names_from_parent, Naming.parsePartsToVariants(dynamicAnchorParts));

      if (unresolved.$ref) {
        if (Object.keys(unresolved).length === 1) {
          this.addIfDefined(names, Naming.parse(unresolved.$ref));
        } else {
          const parsedRef = Naming.parse(unresolved.$ref);
          if (parsedRef) {
            names_from_parent.push(parsedRef);
          }
        }
      }

      // if (unresolved.$dynamicRef) {
      //   if (Object.keys(unresolved).length === 1) {
      //     this.addIfDefined(names, Naming.parse(unresolved.$dynamicRef, true, true));
      //   } else {
      //     const parsedRef = Naming.parse(unresolved.$dynamicRef, true, true);
      //     if (parsedRef) {
      //       names_from_parent.push(parsedRef);
      //     }
      //   }
      // }

      if (unresolved.if) {

        let notConditionalKeys = Object.keys(unresolved).length;
        if (unresolved.if !== undefined) notConditionalKeys--;
        if (unresolved.then !== undefined) notConditionalKeys--;
        if (unresolved.else !== undefined) notConditionalKeys--;

        // if (notConditionalKeys === 0) {
        //   names_suffixes.push('Phi');
        // }
      }

      unresolved_properties_suffixes = this.getWithPropertiesSuffixes(unresolved);
      type_suffixes = this.getTypeSuffixes(unresolved);
    }

    const specificNameCount = names.length;

    if (nameOptions.onlyExplicit) {
      return Naming.simplify(names);
    }

    if (resolved && typeof resolved === 'object') {

      this.addIfDefined(names_from_parent, this.getNameHint(resolved));
      this.addIfDefined(names_from_parent, Naming.parse(resolved.$id));
      this.addIfDefined(names_from_parent, resolved.title);
      this.addIfDefined(names_from_parent, Naming.parse(resolved.$schema));

      const derefComment = Naming.parseToParts(resolved.$comment);
      if (derefComment && derefComment.protocol && derefComment.hashes.length > 0) {
        this.addIfDefined(names_from_parent, derefComment.hashes[0]);
      }

      const dynamicAnchorParts = Naming.parseToParts(resolved.$dynamicAnchor, true, true);
      this.addIfDefined(names_from_parent, Naming.parse(dynamicAnchorParts?.at));
      this.addIfDefined(names_from_parent, Naming.parsePartsToVariants(dynamicAnchorParts));

      const resolved_type_suffixes = this.getTypeSuffixes(resolved);
      if (!type_suffixes) {
        type_suffixes = resolved_type_suffixes;
      } else if (resolved_type_suffixes) {

        type_suffixes = {
          type: type_suffixes.type ?? resolved_type_suffixes.type,
          format: type_suffixes.format ?? resolved_type_suffixes.format,
        };
      }

      parent_properties_suffixes = this.getWithPropertiesSuffixes(resolved);
    }

    const owner_based_names: TypeName[] = [];

    if (nameOptions.ownerName) {
      const nameCount = names.length;
      for (let i = 0; i < nameCount; i++) {
        names.push({name: nameOptions.ownerName, suffix: names[i]});
      }

      if (nameOptions.key) {
        owner_based_names.push({name: nameOptions.ownerName, suffix: nameOptions.key});
      }
      if (nameOptions.suffix) {
        owner_based_names.push({name: nameOptions.ownerName, suffix: nameOptions.suffix});
      }
      if (nameOptions.preferSuffix) {
        owner_based_names.push({name: nameOptions.ownerName, suffix: nameOptions.preferSuffix});
      }
    }

    if (isDirectRef) {
      for (const name_parent of names_from_parent) {
        names.push(name_parent);
      }
    } else {

      for (const name_parent of names_from_parent) {

        const nameCount = names.length;
        for (let i = 0; i < nameCount; i++) {
          const name_child = names[i];
          names.push({name: name_child, suffix: name_parent});
        }

        if (unresolved_properties_suffixes) {
          for (const suffix of unresolved_properties_suffixes) {
            names.push({name: name_parent, suffix: suffix});
            if (nameOptions.key) {
              names.push({name: name_parent, suffix: {name: nameOptions.key, suffix: suffix}});
            }
          }
        }
      }
    }

    if (names_from_parent.length === 0 && parent_properties_suffixes && !isDirectRef) {
      // Only fallback on `WithProp` names for the parent schema if none else was found.
      names_from_parent.push(...parent_properties_suffixes);
    }

    names.push(...owner_based_names);

    if (unresolved_properties_suffixes) {

      for (const suffix of unresolved_properties_suffixes) {
        if (nameOptions.ownerName) {
          names.push({name: nameOptions.ownerName, suffix: suffix});
        }
      }

      for (const suffix of unresolved_properties_suffixes) {
        names.push(suffix);
      }

      for (const suffix of unresolved_properties_suffixes) {
        if (nameOptions.key) {
          names.push({name: nameOptions.key, suffix: suffix});
        }
      }
    }

    const formatted_type_suffixes = this.formatTypeSuffix(type_suffixes);

    if (nameOptions.key) {
      if (formatted_type_suffixes) {
        names.splice(insertKeyIndex, 0, nameOptions.key);
        // names.push({name: nameOptions.key, suffix: formatted_type_suffixes});
      } else {
        names.splice(insertKeyIndex, 0, nameOptions.key);
      }
    }

    if (formatted_type_suffixes) {
      const nameCount = names.length;
      for (let i = 0; i < nameCount; i++) {
        names.push({name: names[i], suffix: formatted_type_suffixes});
      }
    }


    const names_fallback_1: TypeName[] = [];

    // if (nameOptions.key) {
    //   if (formatted_type_suffixes) {
    //     names.splice(insertKeyIndex, 0, nameOptions.key);
    //     names.push({name: nameOptions.key, suffix: formatted_type_suffixes});
    //   } else {
    //     names.splice(insertKeyIndex, 0, nameOptions.key);
    //   }
    // }

    if (!unresolved_properties_suffixes) {
      for (const name_parent of names_from_parent) {
        names_fallback_1.push({name: name_parent, suffix: 'Ext'});
      }
    }

    if (formatted_type_suffixes) {
      const nameCount = names_fallback_1.length;
      for (let i = 0; i < nameCount; i++) {
        names_fallback_1.push({name: names_fallback_1[i], suffix: formatted_type_suffixes});
      }
    }

    names.push(...names_fallback_1);

    if (names.length === 0 && formatted_type_suffixes) {
      if (nameOptions.ownerName) {
        names.push({name: nameOptions.ownerName, suffix: formatted_type_suffixes});
      }
      names.push(formatted_type_suffixes);
    }

    if (nameOptions.ownerName) {
      if (nameOptions.fallbackSuffix) {
        names.push({name: nameOptions.ownerName, suffix: nameOptions.fallbackSuffix});
      }
    }

    if (nameOptions.preferredOwnerName) {
      const nameCount = names.length;
      for (let i = 0; i < nameCount; i++) {
        names[i] = {name: nameOptions.preferredOwnerName, suffix: names[i]};
      }
    }
    // if (nameOptions.ownerName && nameOptions.requireOwnerName) {
    //   const nameCount = names.length;
    //   for (let i = 0; i < nameCount; i++) {
    //     names[i] = {name: nameOptions.ownerName, suffix: names[i]};
    //   }
    // }

    if (nameOptions.suffix) {
      for (let i = 0; i < names.length; i++) {
        if (owner_based_names.includes(names[i])) {
          // TODO: Redo how things are built/added, so we have multiple different arrays and run actions on them and then aggregate them at the end... like substreams.
          continue;
        }
        names[i] = {name: names[i], suffix: nameOptions.suffix};
      }
    }

    if (nameOptions.fallbackSuffix && !isDirectRef) {
      const nameCount = names.length;
      for (let i = 0; i < nameCount; i++) {
        if (owner_based_names.includes(names[i])) {
          // TODO: Redo how things are built/added, so we have multiple different arrays and run actions on them and then aggregate them at the end... like substreams.
          continue;
        }

        names.push({name: names[i], suffix: nameOptions.fallbackSuffix});
      }
    }

    if (nameOptions.alternatives) {
      names.splice(specificNameCount, 0, nameOptions.alternatives);
    }


    const name = Naming.simplify(names);

    return name;
  }

  // private applySuffix(name: TypeName[], suffix: TypeName | undefined, intermix = false) {
  //   if (suffix) {
  //     for (let i = 0; i < name.length; i++) {
  //       name[i] = {name: name[i], suffix: suffix} satisfies TypeName;
  //     }
  //   }
  //
  //   return name;
  // }

  private addIfDefined(arr: (TypeName | undefined)[], name: TypeName | undefined) {
    if (name && (!Array.isArray(name) || name.length > 0)) {
      arr.push(name);
    }
  }

  private getNameHint(schema: JSONSchema9): TypeName | undefined {

    if (PROP_NAME_HINT in schema) {
      const hint = (schema as any)[PROP_NAME_HINT] as TypeName | undefined;
      if (hint) {
        if (typeof hint === 'string') {
          return Naming.parse(hint);
        } else {
          return hint;
        }
      }
    }

    return undefined;
  }

  public getWithPropertiesSuffixes(schema: JSONSchema9): TypeName[] | undefined {

    let names: TypeName[] = [];
    let maxWith = 5;
    if (schema.required) {
      for (const k of schema.required) {
        names.push(`With${Case.pascal(k)}`);
        if (--maxWith === 0) {
          break;
        }
      }
    }
    if (schema.properties) {
      const entries = Object.entries(schema.properties).filter((e) => !schema.required || !schema.required.includes(e[0]));
      for (const e of entries) {
        names.push(`With${Case.pascal(e[0])}`);
        if (--maxWith === 0) {
          break;
        }
      }
    }

    if (names.length === 0) {
      return undefined;
    }

    return names;
  }

  public getTypeSuffixes(schema: JSONSchema9): TypeSuffix | undefined {

    if (schema.format && schema.type) {
      return {
        type: schema.type,
        format: schema.format,
      };
    } else if (schema.format) {
      return {
        format: schema.format,
      };
    } else if (schema.type) {
      return {
        type: schema.type,
      };
    }

    return undefined;
  }

  public formatTypeSuffix(suffix: TypeSuffix | undefined): TypeName | undefined {

    if (suffix?.format && suffix?.type) {

      if (Array.isArray(suffix.type)) {
        return [
          Case.pascal(suffix.format),
          `${suffix.type.map(it => Case.pascal(it)).join('Or')}${Case.pascal(suffix.format)}`,
          ...suffix.type.map(it => Case.pascal(it)),
        ];

      } else {
        return [
          Case.pascal(suffix.format),
          `${Case.pascal(suffix.type)}${Case.pascal(suffix.format)}`,
          Case.pascal(suffix.type),
        ];
      }
    } else if (suffix?.format) {
      return Case.pascal(suffix.format);
    } else if (suffix?.type) {
      if (Array.isArray(suffix.type)) {
        return suffix?.type.map(it => Case.pascal(it)).join('Or');
      } else {
        return Case.pascal(suffix.type);
      }
    }

    return undefined;
  }
}
