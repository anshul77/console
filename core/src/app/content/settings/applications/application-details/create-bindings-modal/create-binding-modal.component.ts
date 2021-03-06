import { ApplicationBindingService } from '../application-binding-service';
import { ComponentCommunicationService } from '../../../../../shared/services/component-communication.service';
import { NamespacesService } from '../../../../namespaces/services/namespaces.service';
import { Component, Input, ViewChild, TemplateRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApplicationsService } from '../../services/applications.service';
import { ModalService, ModalRef } from 'fundamental-ngx';
import { NamespaceInfo } from '../../../../../content/namespaces/namespace-info';
import { EnabledMappingServices } from '../../../../../shared/datamodel/enabled-mapping-services';
import * as _ from 'lodash';
import { forkJoin } from 'rxjs';
import { DEFAULT_MODAL_CONFIG } from '../../../../../shared/constants/constants';

@Component({
  selector: 'app-create-bindings-modal',
  templateUrl: './create-binding-modal.component.html',
  styleUrls: ['./create-binding-modal.component.scss']
})
export class CreateBindingsModalComponent {
  @ViewChild('createBindingModal', { static: false }) createBindingModal: TemplateRef<ModalRef>;

  private selectedApplicationsState = [];
  private namespacesService: NamespacesService;
  public application: any;
  public ariaExpanded = false;
  public ariaHidden = true;
  public isActive = false;
  public allServices = true;
  public namespaceName;
  public filteredNamespacesNames: string[] = [];

  constructor(
    namespacesService: NamespacesService,
    private applicationService: ApplicationsService,
    private route: ActivatedRoute,
    private applicationBindingService: ApplicationBindingService,
    private communication: ComponentCommunicationService,
    private modalService: ModalService
  ) {
    this.namespacesService = namespacesService;
    this.applicationBindingService = applicationBindingService;
  }

  get applicationHasAnyServices(): boolean {
    return (
      this.application &&
      this.application.services &&
      this.application.services.length
    );
  }

  public show() {
    this.route.params.subscribe(params => {
      const applicationId = params['id'];
      const observables = [
        this.applicationService.getApplication(applicationId) as any,
        this.namespacesService.getFilteredNamespaces() as any
      ];

      forkJoin(observables).subscribe(
        (response: any) => {
          this.application = response[0].application;
          const namespaces = response[1];
          if (this.application && this.application.enabledMappingServices) {
            namespaces.forEach(namespace => {
              if (typeof namespace.getLabel !== 'function') {
                namespace = new NamespaceInfo(namespace);
              }
              this.getFilteredNamespaces(
                this.application.enabledMappingServices,
                namespace
              );
            });
          }
        },
        err => {
          console.log(err);
        }
      );
      this.isActive = true;
      this.modalService
        .open(this.createBindingModal, {
          ...DEFAULT_MODAL_CONFIG,

          width: '30em'
        })
        .afterClosed.toPromise()
        .finally(() => {
          this.isActive = false;
          this.namespaceName = null;
          this.allServices = true;
          this.filteredNamespacesNames = [];
        });
    });
  }

  private getFilteredNamespaces(
    usedNamespaces: EnabledMappingServices[],
    namespace: NamespaceInfo
  ) {
    if (!namespace || !(typeof namespace.getLabel === 'function')) {
      console.warn(`Couldn't get label for namespace`, namespace);
      return;
    }
    const exists = usedNamespaces.some(
      usedNamespace => usedNamespace.namespace === namespace.getLabel()
    );

    if (
      !exists &&
      !this.filteredNamespacesNames.includes(namespace.getLabel())
    ) {
      this.filteredNamespacesNames.push(namespace.getLabel());
    }
  }

  save() {
    if (this.application && this.application.name) {
      this.applicationBindingService
        .bind(
          this.namespaceName,
          this.application.name,
          this.allServices,
          this.selectedApplicationsState
        ) // TODO unmock
        .subscribe(
          res => {
            this.communication.sendEvent({
              type: 'updateResource',
              data: res
            });
          },
          err => {
            console.log(err);
          }
        );

      this.close();
    }
  }

  public close() {
    this.allServices = true;
    this.selectedApplicationsState = [];
    this.isActive = false;
    this.namespaceName = null;
    this.filteredNamespacesNames = [];
    this.modalService.dismissAll();
  }

  checkIfNamespaceExists() {
    if (this.filteredNamespacesNames.length > 0 && this.namespaceName) {
      return this.filteredNamespacesNames.includes(this.namespaceName);
    } else {
      return false;
    }
  }

  applicationSelected(id) {
    return (
      this.selectedApplicationsState &&
      _.some(this.selectedApplicationsState, { id })
    );
  }

  toggleApplication(applicationId, event) {
    event.stopPropagation();
    if (this.applicationSelected(applicationId)) {
      const index = this.selectedApplicationsState.indexOf(applicationId);
      this.selectedApplicationsState = this.selectedApplicationsState.filter(
        item => item.id !== applicationId
      );
    } else {
      this.selectedApplicationsState.push({ id: applicationId });
    }
  }

  hasType(entries, type) {
    return _.some(entries, { type });
  }
}
