import nodePath from 'path';

export type Protocols = 'https' | 'http' | 'file';

export interface JsonItemAbsoluteUri {
  protocol: Protocols;
  absoluteDocumentUri: string;
  absoluteUri: string;
  path: string[];
}

export interface JsonItemPartialUri {
  protocol?: Protocols | undefined;
  documentUri?: string | undefined;
  path?: string | undefined;
}

export class JsonPathResolver {

  public static toPartialUri(uriString: string): Readonly<JsonItemPartialUri> {

    const protocolIndex = uriString.indexOf(':');
    const hashIndex = uriString.indexOf('#');

    const protocol = (protocolIndex != -1) ? uriString.substring(0, protocolIndex).toLowerCase() : undefined;

    let documentUri = uriString;
    if (hashIndex != -1) {
      documentUri = documentUri.substring(0, hashIndex);
    }
    if (protocolIndex != -1 && protocol == 'file') {
      // Remove the "file:" part of the document uri for files
      documentUri = documentUri.substring(protocolIndex + 1);
    }

    if (protocol != 'https' && protocol != 'http' && protocol != 'file' && protocol != undefined) {
      throw new Error(`Unknown protocol ${protocol}`);
    }

    const path = (hashIndex != -1) ? uriString.substring(hashIndex + 1) : undefined;

    return {
      protocol: protocol,
      documentUri: documentUri.length > 0 ? documentUri : undefined,
      path: path,
    };
  }

  public static toAbsoluteUriParts(parent: JsonItemAbsoluteUri | undefined, uriString: string): Readonly<JsonItemAbsoluteUri> {

    const uri = JsonPathResolver.toPartialUri(uriString);

    const hashPath = uri.path ? uri.path.split('/').filter(Boolean) : [];
    const hashSuffix = hashPath.length > 0 ? `#${uri.path}` : '';

    if (uri.protocol == 'http' || uri.protocol == 'https') {

      if (!uri.documentUri) {
        throw new Error(`Must give the URL to the document for ${uriString}`);
      }

      return {
        protocol: uri.protocol,
        absoluteDocumentUri: uri.documentUri,
        absoluteUri: `${uri.protocol}://${uri.documentUri}${hashSuffix}`,
        path: hashPath,
      };
    }

    if (!parent) {

      if (!uri.documentUri) {
        throw new Error(`Must give the file path to the document for ${uriString}`);
      }

      const absoluteFilePath = nodePath.resolve(uri.documentUri);
      const protocol = uri.protocol ?? 'file';

      return {
        protocol: protocol,
        absoluteDocumentUri: absoluteFilePath,
        absoluteUri: `${protocol}:${absoluteFilePath}${hashSuffix}`,
        path: hashPath,
      };
    } else {

      if (parent.protocol == 'http' || parent.protocol == 'https') {

        const resolvedUrl = uri.documentUri ? new URL(uri.documentUri, parent.absoluteDocumentUri).href : parent.absoluteDocumentUri;

        // If we've gone online once, then we need to keep being there.
        return {
          protocol: parent.protocol,
          absoluteDocumentUri: resolvedUrl,
          absoluteUri: `${resolvedUrl}${hashSuffix}`,
          path: hashPath,
        };
      } else {

        const absoluteFilePath = uri.documentUri
          ? nodePath.resolve(nodePath.dirname(parent.absoluteDocumentUri), uri.documentUri)
          : parent.absoluteDocumentUri;

        const protocol = uri.protocol ?? parent.protocol;

        return {
          protocol: protocol,
          absoluteDocumentUri: absoluteFilePath,
          absoluteUri: `${protocol}:${absoluteFilePath}${hashSuffix}`,
          path: hashPath,
        };
      }
    }
  }
}
